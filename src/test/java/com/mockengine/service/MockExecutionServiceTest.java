package com.mockengine.service;

import com.mockengine.document.RequestAuditLogDocument;
import com.mockengine.entity.MockEndpoint;
import com.mockengine.repository.mongo.RequestAuditLogMongoRepository;
import com.mockengine.service.MockRouteMatcherService.MatchResult;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MockExecutionServiceTest {

    @Mock
    private MockRouteMatcherService routeMatcherService;

    @Mock
    private StateManagementService stateManagementService;

    @Mock
    private NetworkSimulationService networkSimulationService;

    @Mock
    private JsonTemplateEngine jsonTemplateEngine;

    @Mock
    private JsonSchemaValidationService schemaValidationService;

    @Mock
    private RequestAuditLogMongoRepository auditLogMongoRepository;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private MockExecutionService executionService;

    @Test
    @DisplayName("Debe ejecutar el mock y persistir el log de auditoría en MongoDB")
    void executeMock_SavesAuditLogDocumentInMongo() {
        MockEndpoint endpoint = MockEndpoint.builder()
                .id(1L)
                .name("Get Balance")
                .httpMethod("GET")
                .pathPattern("/api/balance")
                .statusCode(200)
                .responseBody("{\"balance\": 100}")
                .ownerUsername("pedro")
                .delayMs(0L)
                .errorRate(0.0)
                .build();

        MatchResult matchResult = MatchResult.builder()
                .endpoint(endpoint)
                .pathVariables(Map.of())
                .build();

        when(request.getHeader("X-Session-ID")).thenReturn("sess-test-123");
        when(request.getHeaderNames()).thenReturn(Collections.enumeration(Collections.singletonList("X-Session-ID")));
        when(routeMatcherService.findMatch("GET", "/api/balance")).thenReturn(Optional.of(matchResult));
        when(networkSimulationService.shouldSimulateFailure(anyDouble())).thenReturn(false);
        when(stateManagementService.getState("sess-test-123")).thenReturn(Map.of());
        when(jsonTemplateEngine.evaluateTemplate(any(), any(), any())).thenReturn("{\"balance\": 100}");

        ResponseEntity<?> response = executionService.executeMock("GET", "/api/balance", request, "{}");

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo("{\"balance\": 100}");

        ArgumentCaptor<RequestAuditLogDocument> captor = ArgumentCaptor.forClass(RequestAuditLogDocument.class);
        verify(auditLogMongoRepository).save(captor.capture());

        RequestAuditLogDocument savedDoc = captor.getValue();
        assertThat(savedDoc.getSessionKey()).isEqualTo("sess-test-123");
        assertThat(savedDoc.getOwnerUsername()).isEqualTo("pedro");
        assertThat(savedDoc.getHttpMethod()).isEqualTo("GET");
        assertThat(savedDoc.getRequestUri()).isEqualTo("/api/balance");
        assertThat(savedDoc.getStatusCode()).isEqualTo(200);
        assertThat(savedDoc.getResponseBody()).isEqualTo("{\"balance\": 100}");
        assertThat(savedDoc.getRequestHeaders()).containsKey("X-Session-ID");
    }
}
