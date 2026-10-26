package com.mockengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.jpa.ScenarioStateRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StateManagementServiceTest {

    @Mock
    private ScenarioStateRepository scenarioStateRepository;

    @Mock
    private EphemeralSessionRedisService ephemeralSessionRedisService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private StateManagementService stateManagementService;

    @Test
    @DisplayName("Sesión regular debe consultar el estado en PostgreSQL")
    void getState_RegularSession_FetchesFromPostgres() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("regular-sess")
                .stateJson("{\"counter\": 5}")
                .build();

        when(scenarioStateRepository.findBySessionKey("regular-sess")).thenReturn(Optional.of(state));

        Map<String, Object> result = stateManagementService.getState("regular-sess");

        assertThat(result).containsEntry("counter", 5);
        verify(scenarioStateRepository).findBySessionKey("regular-sess");
        verifyNoInteractions(ephemeralSessionRedisService);
    }

    @Test
    @DisplayName("Sesión de invitado (guest_*) debe consultar el estado en Redis")
    void getState_GuestSession_FetchesFromRedis() {
        when(ephemeralSessionRedisService.getGuestState("guest_abc"))
                .thenReturn(Optional.of("{\"guestStep\": \"VERIFIED\"}"));

        Map<String, Object> result = stateManagementService.getState("guest_abc");

        assertThat(result).containsEntry("guestStep", "VERIFIED");
        verify(ephemeralSessionRedisService).getGuestState("guest_abc");
        verifyNoInteractions(scenarioStateRepository);
    }

    @Test
    @DisplayName("Sesión regular debe actualizar el estado en PostgreSQL")
    void updateState_RegularSession_SavesInPostgres() {
        when(scenarioStateRepository.findBySessionKey("regular-sess")).thenReturn(Optional.empty());

        stateManagementService.updateState("regular-sess", Map.of("key", "val"));

        verify(scenarioStateRepository).save(any(ScenarioState.class));
        verify(ephemeralSessionRedisService, never()).saveGuestState(anyString(), anyString());
    }

    @Test
    @DisplayName("Sesión de invitado (guest_*) debe actualizar el estado en Redis")
    void updateState_GuestSession_SavesInRedis() {
        when(ephemeralSessionRedisService.getGuestState("guest_xyz")).thenReturn(Optional.empty());

        stateManagementService.updateState("guest_xyz", Map.of("guestKey", 123));

        verify(ephemeralSessionRedisService).saveGuestState(eq("guest_xyz"), contains("guestKey"));
        verify(scenarioStateRepository, never()).save(any());
    }

    @Test
    @DisplayName("Reset de sesión regular debe eliminar de PostgreSQL")
    void resetState_RegularSession_DeletesFromPostgres() {
        stateManagementService.resetState("regular-sess");

        verify(scenarioStateRepository).deleteBySessionKey("regular-sess");
        verify(ephemeralSessionRedisService, never()).deleteGuestState(anyString());
    }

    @Test
    @DisplayName("Reset de sesión de invitado debe eliminar de Redis")
    void resetState_GuestSession_DeletesFromRedis() {
        stateManagementService.resetState("guest_123");

        verify(ephemeralSessionRedisService).deleteGuestState("guest_123");
        verify(scenarioStateRepository, never()).deleteBySessionKey(anyString());
    }
}
