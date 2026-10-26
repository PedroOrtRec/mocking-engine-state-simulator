package com.mockengine.repository.jpa;

import com.mockengine.entity.ScenarioState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScenarioStateRepository extends JpaRepository<ScenarioState, Long> {

    Optional<ScenarioState> findBySessionKey(String sessionKey);

    void deleteBySessionKey(String sessionKey);
}
