package com.mockengine.repository.jpa;

import com.mockengine.entity.MockEndpoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MockEndpointRepository extends JpaRepository<MockEndpoint, Long> {

    // Devuelve todos los mocks activos para cargarlos o evaluarlos
    List<MockEndpoint> findByActiveTrue();

    // Busca un mock específico por método y ruta exacta
    Optional<MockEndpoint> findByHttpMethodAndPathPattern(String httpMethod, String pathPattern);

    // Permite listar los endpoints de un método HTTP concreto
    List<MockEndpoint> findByHttpMethod(String httpMethod);

    // Para el panel del usuario regular / invitado:
    List<MockEndpoint> findByOwnerUsername(String ownerUsername);

    // Para tareas de limpieza de endpoints efímeros:
    List<MockEndpoint> findByEphemeralTrueAndCreatedAtBefore(LocalDateTime threshold);
}
