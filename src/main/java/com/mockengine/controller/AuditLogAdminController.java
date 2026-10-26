package com.mockengine.controller;

import com.mockengine.document.RequestAuditLogDocument;
import com.mockengine.repository.mongo.RequestAuditLogMongoRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/logs")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('USER', 'ADMIN', 'GUEST')")
@Tag(name = "Auditoría de Peticiones", description = "Consulta e inspección de logs de peticiones y respuestas en MongoDB")
@Slf4j
public class AuditLogAdminController {

    private final RequestAuditLogMongoRepository mongoRepository;

    @GetMapping
    public ResponseEntity<Page<RequestAuditLogDocument>> getLogs(
            @RequestParam(required = false) String sessionKey,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            Authentication authentication
    ) {
        PageRequest pageRequest = PageRequest.of(page, size);
        boolean isAdmin = isAdmin(authentication);
        boolean hasSessionKey = sessionKey != null && !sessionKey.isBlank();

        if (isAdmin || authentication == null) {
            log.info("Acceso administrativo: consultando logs de auditoría en MongoDB (sessionKey={})", sessionKey);
            if (hasSessionKey) {
                return ResponseEntity.ok(mongoRepository.findBySessionKeyOrderByTimestampDesc(sessionKey, pageRequest));
            }
            return ResponseEntity.ok(mongoRepository.findAllByOrderByTimestampDesc(pageRequest));
        }

        String currentUsername = authentication.getName();
        log.info("Acceso segregado: consultando logs para propietario: {} (sessionKey={})", currentUsername, sessionKey);

        if (hasSessionKey) {
            return ResponseEntity.ok(mongoRepository.findByOwnerUsernameAndSessionKeyOrderByTimestampDesc(currentUsername, sessionKey, pageRequest));
        }
        return ResponseEntity.ok(mongoRepository.findByOwnerUsernameOrderByTimestampDesc(currentUsername, pageRequest));
    }

    private boolean isAdmin(Authentication authentication) {
        return authentication != null && authentication.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }
}
