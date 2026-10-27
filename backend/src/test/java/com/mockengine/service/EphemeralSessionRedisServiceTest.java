package com.mockengine.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.time.Duration;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EphemeralSessionRedisServiceTest {

    @Mock
    private RedisTemplate<String, Object> redisTemplate;

    @Mock
    private ValueOperations<String, Object> valueOperations;

    @InjectMocks
    private EphemeralSessionRedisService redisService;

    @BeforeEach
    void setUp() {
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
    }

    @Test
    @DisplayName("Debe guardar estado de invitado en Redis con TTL de 24 horas")
    void saveGuestState_SetsKeyWithTtl() {
        String sessionKey = "guest_12345";
        String json = "{\"step\": \"INIT\"}";

        redisService.saveGuestState(sessionKey, json);

        verify(valueOperations).set("session:guest:guest_12345", json, Duration.ofHours(24));
    }

    @Test
    @DisplayName("Debe recuperar estado de invitado desde Redis")
    void getGuestState_ReturnsValueIfExists() {
        String sessionKey = "guest_12345";
        when(valueOperations.get("session:guest:guest_12345")).thenReturn("{\"step\": \"STEP_2\"}");

        Optional<String> result = redisService.getGuestState(sessionKey);

        assertThat(result).isPresent().contains("{\"step\": \"STEP_2\"}");
        verify(valueOperations).get("session:guest:guest_12345");
    }

    @Test
    @DisplayName("Debe retornar Optional.empty() si la clave no existe en Redis")
    void getGuestState_ReturnsEmptyIfMissing() {
        String sessionKey = "guest_nonexistent";
        when(valueOperations.get("session:guest:guest_nonexistent")).thenReturn(null);

        Optional<String> result = redisService.getGuestState(sessionKey);

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Debe eliminar la clave de sesión efímera en Redis")
    void deleteGuestState_DeletesKey() {
        String sessionKey = "guest_12345";

        redisService.deleteGuestState(sessionKey);

        verify(redisTemplate).delete("session:guest:guest_12345");
    }

    @Test
    @DisplayName("Debe comprobar si la clave de sesión efímera existe en Redis")
    void hasGuestState_ChecksKeyExistence() {
        when(redisTemplate.hasKey("session:guest:guest_12345")).thenReturn(true);

        boolean exists = redisService.hasGuestState("guest_12345");

        assertThat(exists).isTrue();
        verify(redisTemplate).hasKey("session:guest:guest_12345");
    }
}
