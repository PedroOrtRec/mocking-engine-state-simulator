package com.mockengine.repository.jpa;

import com.mockengine.entity.ScenarioState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ScenarioStateRepository extends JpaRepository<ScenarioState, Long> {

    Optional<ScenarioState> findBySessionKey(String sessionKey);

    Optional<ScenarioState> findByOwnerUsernameAndName(String ownerUsername, String name);

    List<ScenarioState> findByOwnerUsername(String ownerUsername);

    List<ScenarioState> findByOwnerUsernameOrSystemTrue(String ownerUsername);

    long countByOwnerUsername(String ownerUsername);

    boolean existsByOwnerUsernameAndName(String ownerUsername, String name);

    void deleteBySessionKey(String sessionKey);
}
