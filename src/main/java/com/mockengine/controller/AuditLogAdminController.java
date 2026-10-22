package com.mockengine.controller;

import com.mockengine.entity.RequestAuditLog;
import com.mockengine.repository.RequestAuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/logs")
@RequiredArgsConstructor
public class AuditLogAdminController {

    private final RequestAuditLogRepository logRepository;

    @GetMapping
    public ResponseEntity<Page<RequestAuditLog>> getLogs(
            @RequestParam(required = false) String sessionKey,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        PageRequest pageRequest = PageRequest.of(page, size);
        if (sessionKey != null && !sessionKey.isBlank()) {
            return ResponseEntity.ok(logRepository.findBySessionKeyOrderByTimestampDesc(sessionKey, pageRequest));
        }
        return ResponseEntity.ok(logRepository.findAllByOrderByTimestampDesc(pageRequest));
    }
}
