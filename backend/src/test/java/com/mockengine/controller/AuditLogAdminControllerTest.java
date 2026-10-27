package com.mockengine.controller;

import com.mockengine.document.RequestAuditLogDocument;
import com.mockengine.exception.GlobalExceptionHandler;
import com.mockengine.repository.mongo.RequestAuditLogMongoRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AuditLogAdminControllerTest {

    private MockMvc mockMvc;

    @Mock
    private RequestAuditLogMongoRepository mongoRepository;

    @InjectMocks
    private AuditLogAdminController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin debe consultar todos los logs globales en MongoDB")
    void getLogs_Admin_ReturnsAllLogs() throws Exception {
        Authentication adminAuth = new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        RequestAuditLogDocument doc1 = RequestAuditLogDocument.builder()
                .id("671cf123456789abcdef0001")
                .sessionKey("sess-1")
                .ownerUsername("pedro")
                .httpMethod("GET")
                .requestUri("/mock/test")
                .statusCode(200)
                .timestamp(Instant.now())
                .build();

        when(mongoRepository.findAllByOrderByTimestampDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(doc1), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/logs")
                        .principal(adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].id").value("671cf123456789abcdef0001"))
                .andExpect(jsonPath("$.content[0].sessionKey").value("sess-1"));

        verify(mongoRepository).findAllByOrderByTimestampDesc(any(PageRequest.class));
    }

    @Test
    @DisplayName("Admin debe consultar logs filtrados por sessionKey")
    void getLogs_AdminWithSessionKey_ReturnsFilteredLogs() throws Exception {
        Authentication adminAuth = new UsernamePasswordAuthenticationToken(
                "admin", null, List.of(new SimpleGrantedAuthority("ROLE_ADMIN")));

        RequestAuditLogDocument doc1 = RequestAuditLogDocument.builder()
                .id("671cf123456789abcdef0002")
                .sessionKey("sess-xyz")
                .ownerUsername("maria")
                .httpMethod("POST")
                .requestUri("/mock/checkout")
                .statusCode(201)
                .build();

        when(mongoRepository.findBySessionKeyOrderByTimestampDesc(eq("sess-xyz"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(doc1), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("sessionKey", "sess-xyz")
                        .principal(adminAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].sessionKey").value("sess-xyz"));

        verify(mongoRepository).findBySessionKeyOrderByTimestampDesc(eq("sess-xyz"), any(PageRequest.class));
    }

    @Test
    @DisplayName("Usuario regular solo debe consultar logs donde sea propietario")
    void getLogs_RegularUser_ReturnsSegregatedLogs() throws Exception {
        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                "pedro", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        RequestAuditLogDocument doc1 = RequestAuditLogDocument.builder()
                .id("671cf123456789abcdef0003")
                .sessionKey("sess-pedro")
                .ownerUsername("pedro")
                .httpMethod("GET")
                .requestUri("/mock/orders")
                .statusCode(200)
                .build();

        when(mongoRepository.findByOwnerUsernameOrderByTimestampDesc(eq("pedro"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(doc1), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/logs")
                        .principal(userAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].ownerUsername").value("pedro"));

        verify(mongoRepository).findByOwnerUsernameOrderByTimestampDesc(eq("pedro"), any(PageRequest.class));
        verify(mongoRepository, never()).findAllByOrderByTimestampDesc(any());
    }

    @Test
    @DisplayName("Usuario regular filtrando por sessionKey solo recibe logs suyos con esa clave")
    void getLogs_RegularUserWithSessionKey_ReturnsSegregatedAndFilteredLogs() throws Exception {
        Authentication userAuth = new UsernamePasswordAuthenticationToken(
                "pedro", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        RequestAuditLogDocument doc1 = RequestAuditLogDocument.builder()
                .id("671cf123456789abcdef0004")
                .sessionKey("sess-target")
                .ownerUsername("pedro")
                .build();

        when(mongoRepository.findByOwnerUsernameAndSessionKeyOrderByTimestampDesc(eq("pedro"), eq("sess-target"), any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(doc1), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/v1/admin/logs")
                        .param("sessionKey", "sess-target")
                        .principal(userAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].sessionKey").value("sess-target"))
                .andExpect(jsonPath("$.content[0].ownerUsername").value("pedro"));

        verify(mongoRepository).findByOwnerUsernameAndSessionKeyOrderByTimestampDesc(eq("pedro"), eq("sess-target"), any(PageRequest.class));
    }
}
