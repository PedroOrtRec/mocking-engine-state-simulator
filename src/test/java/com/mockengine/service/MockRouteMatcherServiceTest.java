package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.MockEndpointRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MockRouteMatcherServiceTest {

    @Mock
    private MockEndpointRepository mockEndpointRepository;

    @InjectMocks
    private MockRouteMatcherService routeMatcherService;

    @Test
    @DisplayName("Debe encontrar coincidencia por path variable y extraerla correctamente")
    void shouldMatchPatternWithPathVariable() {
        // Given
        MockEndpoint mock = MockEndpoint.builder()
                .id(1L)
                .name("Get User By ID")
                .httpMethod("GET")
                .pathPattern("/api/v1/users/{id}")
                .active(true)
                .build();

        when(mockEndpointRepository.findByActiveTrue()).thenReturn(List.of(mock));

        // When
        Optional<MockRouteMatcherService.MatchResult> result =
                routeMatcherService.findMatch("GET", "/api/v1/users/42");

        // Then
        assertThat(result).isPresent();
        assertThat(result.get().getEndpoint().getId()).isEqualTo(1L);
        assertThat(result.get().getPathVariables()).containsEntry("id", "42");
    }
}
