package com.mockengine.dto.state;

import com.mockengine.entity.ScenarioState;
import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScenarioStateDTO {
    private Long id;
    private String name;
    private String ownerUsername;
    private String sessionKey;
    private String stateJson;
    private String initialStateJson;
    private boolean system;
    private LocalDateTime lastAccessedAt;

    public static ScenarioStateDTO fromEntity(ScenarioState entity) {
        String initialJson = (entity.getInitialStateJson() != null && !entity.getInitialStateJson().isBlank())
                ? entity.getInitialStateJson()
                : entity.getStateJson();
        return ScenarioStateDTO.builder()
                .id(entity.getId())
                .name(entity.getName())
                .ownerUsername(entity.getOwnerUsername())
                .sessionKey(entity.getSessionKey())
                .stateJson(entity.getStateJson())
                .initialStateJson(initialJson)
                .system(entity.isSystem())
                .lastAccessedAt(entity.getLastAccessedAt())
                .build();
    }
}
