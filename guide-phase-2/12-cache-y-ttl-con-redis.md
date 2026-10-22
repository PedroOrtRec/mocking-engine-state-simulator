# Módulo 12: Caché de Alto Rendimiento y TTL con Redis

En este módulo integrarás **Redis** en la arquitectura de **Mocking Engine & State Simulator** para cumplir dos propósitos críticos de rendimiento y ciclo de vida de datos:
1. **Caché en memoria sub-milisegundo para el matching de rutas dinámicas** mediante las abstracciones `@Cacheable` y `@CacheEvict` de Spring Cache.
2. **Expiración nativa por tiempo (TTL - *Time to Live*) para sesiones efímeras y mocks de invitados**, delegando en Redis la purga automática sin consumir ciclos de CPU en PostgreSQL.

---

## 🎯 Objetivos de Aprendizaje

1. Configurar **Spring Data Redis** utilizando el cliente reactivo/asíncrono moderno **Lettuce**.
2. Comprender la serialización en Redis: `StringRedisSerializer` para claves y `GenericJackson2JsonRedisSerializer` para valores JSON estructurados.
3. Implementar el patrón **Cache-Aside**: consultar primero la memoria de Redis y solo acudir a PostgreSQL si ocurre un *cache miss*.
4. Invalidar selectivamente la caché (`@CacheEvict`) ante mutaciones (creación, edición o eliminación de mock endpoints).
5. Utilizar comandos nativos de expiración (`EXPIRE` / `SETEX`) para gestionar estados de sesión efímeros de 24 horas.

---

## 1. Dependencias en `pom.xml`

Añadimos el starter de Redis y el contenedor de pruebas:

```xml
<!-- Spring Data Redis Starter con Lettuce -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>

<!-- Testcontainers Redis (Comunidad oficial) -->
<dependency>
    <groupId>com.redis</groupId>
    <artifactId>testcontainers-redis</artifactId>
    <version>2.2.4</version>
    <scope>test</scope>
</dependency>
```

---

## 2. Configuración de Spring Cache con Redis (`RedisConfig`)

Creamos `com.mockengine.config.RedisConfig` con serialización JSON segura:

```java
package com.mockengine.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;

@Configuration
@EnableCaching // Habilita anotaciones @Cacheable, @CachePut, @CacheEvict
public class RedisConfig {

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1)) // TTL por defecto para entradas de caché
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(new GenericJackson2JsonRedisSerializer()));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(config)
                .build();
    }

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
```

---

## 3. Optimización del Motor de Enrutamiento (`@Cacheable` y `@CacheEvict`)

En el Módulo 04, cada llamada a `/mock/**` consultaba la tabla `mock_endpoints` en PostgreSQL.

### Cacheando la lista de endpoints activos:

Modificamos el servicio de búsqueda o consulta de endpoints:

```java
@Service
@RequiredArgsConstructor
@Slf4j
public class MockRouteMatcherService {

    private final MockEndpointRepository mockEndpointRepository;
    private final PathMatcher pathMatcher = new AntPathMatcher();

    // Cachea el listado completo de endpoints activos bajo la clave "active_endpoints"
    @Cacheable(value = "activeMockEndpoints", key = "'all_active'")
    public List<MockEndpoint> getActiveEndpoints() {
        log.debug("Cache MISS: Consultando mock endpoints activos en base de datos relacional");
        return mockEndpointRepository.findByActiveTrue();
    }

    public Optional<MatchResult> findMatch(String httpMethod, String subPath) {
        List<MockEndpoint> activeEndpoints = getActiveEndpoints(); // Se resuelve desde Redis en sub-milisegundo

        for (MockEndpoint endpoint : activeEndpoints) {
            if (endpoint.getHttpMethod().equalsIgnoreCase(httpMethod)
                    && pathMatcher.match(endpoint.getPathPattern(), subPath)) {
                Map<String, String> variables = pathMatcher.extractUriTemplateVariables(endpoint.getPathPattern(), subPath);
                return Optional.of(new MatchResult(endpoint, variables));
            }
        }
        return Optional.empty();
    }
}
```

### Invalidando la caché al mutar endpoints:

En el servicio de administración (`MockEndpointAdminService`):

```java
@Service
@RequiredArgsConstructor
public class MockEndpointAdminService {

    private final MockEndpointRepository repository;

    // Al crear un nuevo mock, evitamos datos obsoletos invalidando la caché:
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public MockEndpointDTO create(MockEndpointDTO dto, String ownerUsername) {
        // Guardar en Postgres...
    }

    // Al actualizar o borrar un mock, también limpiamos la caché:
    @CacheEvict(value = "activeMockEndpoints", allEntries = true)
    public void delete(Long id) {
        repository.deleteById(id);
    }
}
```

---

## 4. Almacenamiento de Sesiones Efímeras con TTL Nativo en Redis

Para las sesiones de invitados (`guest_xxxxxxxx`), podemos almacenar el estado del escenario en Redis con expiración automática de 24 horas:

```java
@Service
@RequiredArgsConstructor
public class EphemeralSessionRedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private static final long GUEST_SESSION_TTL_HOURS = 24;

    public void saveGuestState(String sessionKey, String stateJson) {
        String redisKey = "session:guest:" + sessionKey;
        // Almacena y define TTL en una sola operación atómica:
        redisTemplate.opsForValue().set(redisKey, stateJson, Duration.ofHours(GUEST_SESSION_TTL_HOURS));
    }

    public Optional<String> getGuestState(String sessionKey) {
        String redisKey = "session:guest:" + sessionKey;
        Object val = redisTemplate.opsForValue().get(redisKey);
        return Optional.ofNullable(val).map(Object::toString);
    }
}
```

> [!TIP]
> **Ventaja de diseño:** Al expirar los 24 horas, Redis elimina la clave por sí mismo en segundo plano (*passive expiration & active sweep*), sin necesidad de ejecutar sentencias SQL `DELETE` periódicas en la base de datos principal.

---

## 5. Servicio de Redis en `docker-compose.yml`

```yaml
  redis:
    image: redis:7.2-alpine
    container_name: mockengine-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
```

Y en `application.yml`:

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

¡Avanza al **[Módulo 13: Tareas Programadas de Limpieza (`@Scheduled`)](./13-tareas-programadas-limpieza-scheduled.md)** para gestionar el ciclo de vida y la retención de los datos efímeros en PostgreSQL!
