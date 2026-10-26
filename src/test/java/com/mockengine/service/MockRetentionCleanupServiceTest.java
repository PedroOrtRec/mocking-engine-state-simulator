package com.mockengine.service;

import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.jpa.MockEndpointRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MockRetentionCleanupServiceTest {

    @Mock
    private MockEndpointRepository mockEndpointRepository;

    @InjectMocks
    private MockRetentionCleanupService cleanupService;

    @Test
    @DisplayName("Debe purgar los endpoints efímeros expirados en lote (batch)")
    void purgeExpiredEphemeralMockEndpoints_DeletesExpiredInBatch() {
        MockEndpoint ep1 = MockEndpoint.builder()
                .id(1L)
                .name("Guest Mock 1")
                .ownerUsername("guest_111")
                .ephemeral(true)
                .createdAt(LocalDateTime.now().minusHours(25))
                .build();

        MockEndpoint ep2 = MockEndpoint.builder()
                .id(2L)
                .name("Guest Mock 2")
                .ownerUsername("guest_222")
                .ephemeral(true)
                .createdAt(LocalDateTime.now().minusHours(30))
                .build();

        when(mockEndpointRepository.findByEphemeralTrueAndCreatedAtBefore(any(LocalDateTime.class)))
                .thenReturn(List.of(ep1, ep2));

        int deletedCount = cleanupService.purgeExpiredEphemeralMockEndpoints();

        assertThat(deletedCount).isEqualTo(2);
        verify(mockEndpointRepository).deleteAllInBatch(List.of(ep1, ep2));
    }

    @Test
    @DisplayName("No debe ejecutar borrado en lote si no hay endpoints expirados")
    void purgeExpiredEphemeralMockEndpoints_NoExpiredFound() {
        when(mockEndpointRepository.findByEphemeralTrueAndCreatedAtBefore(any(LocalDateTime.class)))
                .thenReturn(Collections.emptyList());

        int deletedCount = cleanupService.purgeExpiredEphemeralMockEndpoints();

        assertThat(deletedCount).isEqualTo(0);
        verify(mockEndpointRepository, never()).deleteAllInBatch(any());
    }
}
