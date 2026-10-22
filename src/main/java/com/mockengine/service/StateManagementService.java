package com.mockengine.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.ScenarioStateRepository;
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
    private final ObjectMapper objectMapper;

    /**
     * Obtiene el mapa de variables de estado para una sesión concreta.
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getState(String sessionKey) {
        return scenarioStateRepository.findBySessionKey(sessionKey)
                .map(this::deserializeState)
                .orElseGet(HashMap::new);
    }

    /**
     * Actualiza una o más variables de estado para una sesión.
     */
    @Transactional
    public void updateState(String sessionKey, Map<String, Object> newValues) {
        ScenarioState stateEntity = scenarioStateRepository.findBySessionKey(sessionKey)
                .orElseGet(() -> ScenarioState.builder()
                        .sessionKey(sessionKey)
                        .stateJson("{}")
                        .build());

        Map<String, Object> currentState = deserializeState(stateEntity);
        currentState.putAll(newValues);

        try {
            stateEntity.setStateJson(objectMapper.writeValueAsString(currentState));
            scenarioStateRepository.save(stateEntity);
            log.debug("Estado actualizado para sesión [{}]: {}", sessionKey, currentState);
        } catch (Exception e) {
            log.error("Error al serializar el estado de sesión: {}", e.getMessage());
        }
    }

    /**
     * Reinicia el estado de una sesión (útil para botones de 'Reset' en las pruebas frontend).
     */
    @Transactional
    public void resetState(String sessionKey) {
        scenarioStateRepository.deleteBySessionKey(sessionKey);
        log.info("Estado reseteado para la sesión [{}]", sessionKey);
    }

    private Map<String, Object> deserializeState(ScenarioState entity) {
        try {
            return objectMapper.readValue(entity.getStateJson(), new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            log.warn("No se pudo deserializar stateJson para sesión {}. Creando estado vacío.", entity.getSessionKey());
            return new HashMap<>();
        }
    }
}
