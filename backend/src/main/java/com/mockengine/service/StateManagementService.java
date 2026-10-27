package com.mockengine.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.dto.state.CreateStateRequest;
import com.mockengine.dto.state.ScenarioStateDTO;
import com.mockengine.dto.state.UpdateStateRequest;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.jpa.ScenarioStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class StateManagementService {

    public static final String DEFAULT_SESSION_KEY = "default";
    public static final int MAX_STATES_PER_USER = 5;
    private static final Set<String> RESERVED_NAMES = Set.of("default", "default-session", "guest");

    private final ScenarioStateRepository scenarioStateRepository;
    private final EphemeralSessionRedisService ephemeralSessionRedisService;
    private final ObjectMapper objectMapper;

    /**
     * Crea un nuevo estado persistente para el usuario, aplicando control de cuotas y nombres reservados.
     */
    @Transactional
    public ScenarioStateDTO createState(CreateStateRequest request, String ownerUsername) {
        String stateName = request.getName().trim().toLowerCase();

        // 1. Validación de palabras reservadas
        if (isReservedName(stateName)) {
            throw new IllegalArgumentException("El nombre '" + stateName + "' está reservado por el sistema");
        }

        // 2. Control de cuota (máximo 5 estados por usuario)
        long currentCount = scenarioStateRepository.countByOwnerUsername(ownerUsername);
        if (currentCount >= MAX_STATES_PER_USER) {
            throw new IllegalStateException("Límite alcanzado: cada usuario puede crear un máximo de " + MAX_STATES_PER_USER + " estados");
        }

        // 3. Unicidad de nombre por usuario
        if (scenarioStateRepository.existsByOwnerUsernameAndName(ownerUsername, stateName)) {
            throw new IllegalArgumentException("Ya tienes un estado registrado con el nombre: " + stateName);
        }

        // 4. Construcción con namespace único: "usuario:nombre-estado"
        String sessionKey = ownerUsername + ":" + stateName;
        ScenarioState state = ScenarioState.builder()
                .name(stateName)
                .ownerUsername(ownerUsername)
                .sessionKey(sessionKey)
                .stateJson(request.getStateJson() != null && !request.getStateJson().isBlank() ? request.getStateJson() : "{}")
                .system(false)
                .build();

        return ScenarioStateDTO.fromEntity(scenarioStateRepository.save(state));
    }

    /**
     * Lista los estados del usuario autenticado incluyendo el estado por defecto del sistema.
     */
    @Transactional
    public List<ScenarioStateDTO> listUserStates(String ownerUsername) {
        getOrCreateDefaultState();
        return scenarioStateRepository.findByOwnerUsernameOrSystemTrue(ownerUsername)
                .stream()
                .map(ScenarioStateDTO::fromEntity)
                .toList();
    }

    /**
     * Obtiene los detalles de un estado específico por su identificador numérico.
     */
    @Transactional(readOnly = true)
    public ScenarioStateDTO getStateById(Long id, String ownerUsername) {
        ScenarioState state = scenarioStateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estado no encontrado con id: " + id));

        if (!state.isSystem() && !state.getOwnerUsername().equals(ownerUsername)) {
            throw new AccessDeniedException("No tienes permiso para ver este estado");
        }
        return ScenarioStateDTO.fromEntity(state);
    }

    /**
     * Actualiza el nombre o JSON de un estado. El estado por defecto del sistema no se puede modificar ni renombrar.
     */
    @Transactional
    public ScenarioStateDTO updateState(Long id, UpdateStateRequest request, String ownerUsername) {
        ScenarioState state = scenarioStateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estado no encontrado con id: " + id));

        if (state.isSystem()) {
            throw new IllegalStateException("El estado del sistema no puede ser modificado ni renombrado");
        }

        if (!state.getOwnerUsername().equals(ownerUsername)) {
            throw new AccessDeniedException("No tienes permiso para modificar este estado");
        }

        if (request.getName() != null && !request.getName().isBlank()) {
            String newName = request.getName().trim().toLowerCase();
            if (!newName.equals(state.getName())) {
                if (isReservedName(newName)) {
                    throw new IllegalArgumentException("El nombre '" + newName + "' está reservado por el sistema");
                }
                if (scenarioStateRepository.existsByOwnerUsernameAndName(ownerUsername, newName)) {
                    throw new IllegalArgumentException("Ya tienes un estado registrado con el nombre: " + newName);
                }
                state.setName(newName);
                state.setSessionKey(ownerUsername + ":" + newName);
            }
        }

        if (request.getStateJson() != null) {
            state.setStateJson(request.getStateJson());
        }

        return ScenarioStateDTO.fromEntity(scenarioStateRepository.save(state));
    }

    /**
     * Elimina un estado por su id. El estado del sistema no puede eliminarse.
     */
    @Transactional
    public void deleteState(Long id, String ownerUsername) {
        ScenarioState state = scenarioStateRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Estado no encontrado con id: " + id));

        if (state.isSystem()) {
            throw new IllegalStateException("El estado del sistema no puede ser eliminado");
        }

        if (!state.getOwnerUsername().equals(ownerUsername)) {
            throw new AccessDeniedException("No tienes permiso para eliminar este estado");
        }

        scenarioStateRepository.delete(state);
    }

    /**
     * Garantiza la existencia del estado 'default' del sistema.
     */
    @Transactional
    public ScenarioState getOrCreateDefaultState() {
        return scenarioStateRepository.findBySessionKey(DEFAULT_SESSION_KEY)
                .orElseGet(() -> scenarioStateRepository.save(
                        ScenarioState.builder()
                                .name(DEFAULT_SESSION_KEY)
                                .ownerUsername("system")
                                .sessionKey(DEFAULT_SESSION_KEY)
                                .stateJson("{}")
                                .system(true)
                                .build()
                ));
    }

    /**
     * Obtiene el mapa de variables de estado para una sesión concreta.
     * Si es una sesión de invitado ("guest_*"), se recupera de Redis.
     * Si es null, vacío o "default", se recupera el estado de sistema de PostgreSQL.
     * De lo contrario, se busca por sessionKey en PostgreSQL.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getState(String sessionKey) {
        if (isGuestSession(sessionKey)) {
            return ephemeralSessionRedisService.getGuestState(sessionKey)
                    .map(this::deserializeJson)
                    .orElseGet(HashMap::new);
        }

        if (isDefaultSession(sessionKey)) {
            return scenarioStateRepository.findBySessionKey(DEFAULT_SESSION_KEY)
                    .map(this::deserializeState)
                    .orElseGet(() -> deserializeState(getOrCreateDefaultState()));
        }

        return scenarioStateRepository.findBySessionKey(sessionKey)
                .map(this::deserializeState)
                .orElseGet(HashMap::new);
    }

    /**
     * Actualiza una o más variables de estado para una sesión.
     * Si es una sesión de invitado, actualiza en Redis con TTL de 24 horas; si no, en PostgreSQL.
     */
    @Transactional
    public void updateState(String sessionKey, Map<String, Object> newValues) {
        Map<String, Object> currentState = getState(sessionKey);
        currentState.putAll(newValues);

        try {
            String json = objectMapper.writeValueAsString(currentState);
            if (isGuestSession(sessionKey)) {
                ephemeralSessionRedisService.saveGuestState(sessionKey, json);
                log.debug("Estado de invitado actualizado en Redis [{}]: {}", sessionKey, currentState);
            } else if (isDefaultSession(sessionKey)) {
                ScenarioState stateEntity = scenarioStateRepository.findBySessionKey(DEFAULT_SESSION_KEY)
                        .orElseGet(this::getOrCreateDefaultState);
                stateEntity.setStateJson(json);
                scenarioStateRepository.save(stateEntity);
                log.debug("Estado del sistema actualizado en PostgreSQL: {}", currentState);
            } else {
                ScenarioState stateEntity = scenarioStateRepository.findBySessionKey(sessionKey)
                        .orElseGet(() -> {
                            String owner = sessionKey != null && sessionKey.contains(":")
                                    ? sessionKey.substring(0, sessionKey.indexOf(":"))
                                    : "unknown";
                            String name = sessionKey != null && sessionKey.contains(":")
                                    ? sessionKey.substring(sessionKey.indexOf(":") + 1)
                                    : sessionKey;
                            return ScenarioState.builder()
                                    .name(name)
                                    .ownerUsername(owner)
                                    .sessionKey(sessionKey)
                                    .stateJson("{}")
                                    .build();
                        });
                stateEntity.setStateJson(json);
                scenarioStateRepository.save(stateEntity);
                log.debug("Estado persistente actualizado en PostgreSQL [{}]: {}", sessionKey, currentState);
            }
        } catch (Exception e) {
            log.error("Error al serializar el estado de sesión: {}", e.getMessage());
        }
    }

    /**
     * Reinicia el estado de una sesión (útil para pruebas y resets).
     */
    @Transactional
    public void resetState(String sessionKey) {
        if (isGuestSession(sessionKey)) {
            ephemeralSessionRedisService.deleteGuestState(sessionKey);
            log.info("Estado de invitado reseteado en Redis [{}]", sessionKey);
        } else if (isDefaultSession(sessionKey)) {
            ScenarioState state = getOrCreateDefaultState();
            state.setStateJson("{}");
            scenarioStateRepository.save(state);
            log.info("Estado por defecto reseteado en PostgreSQL");
        } else {
            scenarioStateRepository.deleteBySessionKey(sessionKey);
            log.info("Estado persistente reseteado en PostgreSQL [{}]", sessionKey);
        }
    }

    public boolean isReservedName(String name) {
        if (name == null) return false;
        String normalized = name.trim().toLowerCase();
        return RESERVED_NAMES.contains(normalized) || normalized.startsWith("guest_") || normalized.equals("guest");
    }

    private boolean isGuestSession(String sessionKey) {
        return sessionKey != null && sessionKey.startsWith("guest_");
    }

    private boolean isDefaultSession(String sessionKey) {
        return sessionKey == null || sessionKey.isBlank()
                || DEFAULT_SESSION_KEY.equalsIgnoreCase(sessionKey)
                || "default-session".equalsIgnoreCase(sessionKey);
    }

    private Map<String, Object> deserializeState(ScenarioState entity) {
        return deserializeJson(entity.getStateJson());
    }

    private Map<String, Object> deserializeJson(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("No se pudo deserializar stateJson. Creando estado vacío: {}", e.getMessage());
            return new HashMap<>();
        }
    }
}
