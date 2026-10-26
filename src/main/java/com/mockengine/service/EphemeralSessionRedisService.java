package com.mockengine.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class EphemeralSessionRedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final long GUEST_SESSION_TTL_HOURS = 24;
    private static final String KEY_PREFIX = "session:guest:";

    public void saveGuestState(String sessionKey, String stateJson) {
        String redisKey = KEY_PREFIX + sessionKey;
        log.debug("Guardando estado efímero en Redis con TTL de {}h para clave: {}", GUEST_SESSION_TTL_HOURS, redisKey);
        redisTemplate.opsForValue().set(redisKey, stateJson, Duration.ofHours(GUEST_SESSION_TTL_HOURS));
    }

    public Optional<String> getGuestState(String sessionKey) {
        String redisKey = KEY_PREFIX + sessionKey;
        Object val = redisTemplate.opsForValue().get(redisKey);
        return Optional.ofNullable(val).map(Object::toString);
    }

    public void deleteGuestState(String sessionKey) {
        String redisKey = KEY_PREFIX + sessionKey;
        log.debug("Eliminando estado efímero en Redis para clave: {}", redisKey);
        redisTemplate.delete(redisKey);
    }

    public boolean hasGuestState(String sessionKey) {
        String redisKey = KEY_PREFIX + sessionKey;
        return Boolean.TRUE.equals(redisTemplate.hasKey(redisKey));
    }
}
