package com.mockengine.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.jpa.ScenarioStateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class StateManagementService {

    private final ScenarioStateRepository scenarioStateRepository;
    private final EphemeralSessionRedisService ephemeralSessionRedisService;
    private final ObjectMapper objectMapper;

    /**
     * Obtiene el mapa de variables de estado para una sesión concreta.
     * Si es una sesión de invitado ("guest_*"), se recupera de Redis; de lo contrario, de PostgreSQL.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getState(String sessionKey) {
        if (isGuestSession(sessionKey)) {
            return ephemeralSessionRedisService.getGuestState(sessionKey)
                    .map(this::deserializeJson)
                    .orElseGet(HashMap::new);
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
            } else {
                ScenarioState stateEntity = scenarioStateRepository.findBySessionKey(sessionKey)
                        .orElseGet(() -> ScenarioState.builder()
                                .sessionKey(sessionKey)
                                .stateJson("{}")
                                .build());
                stateEntity.setStateJson(json);
                scenarioStateRepository.save(stateEntity);
                log.debug("Estado persistente actualizado en PostgreSQL [{}]: {}", sessionKey, currentState);
            }
        } catch (Exception e) {
            log.error("Error al serializar el estado de sesión: {}", e.getMessage());
        }
    }

    /**
     * Reinicia el estado de una sesión (útil para botones de 'Reset' en las pruebas frontend).
     */
    @Transactional
    public void resetState(String sessionKey) {
        if (isGuestSession(sessionKey)) {
            ephemeralSessionRedisService.deleteGuestState(sessionKey);
            log.info("Estado de invitado reseteado en Redis [{}]", sessionKey);
        } else {
            scenarioStateRepository.deleteBySessionKey(sessionKey);
            log.info("Estado persistente reseteado en PostgreSQL [{}]", sessionKey);
        }
    }

    private boolean isGuestSession(String sessionKey) {
        return sessionKey != null && sessionKey.startsWith("guest_");
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
