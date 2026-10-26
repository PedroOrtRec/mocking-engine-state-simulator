package com.mockengine.controller;

import com.mockengine.dto.UserSummaryDTO;
import com.mockengine.entity.User;
import com.mockengine.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Slf4j
public class UserAdminController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<UserSummaryDTO>> listAllUsers() {
        log.info("Acceso administrativo: listando todos los usuarios");
        return ResponseEntity.ok(userService.findAllUsers());
    }

    @PatchMapping("/{userId}/role")
    public ResponseEntity<Void> changeRole(@PathVariable Long userId, @RequestParam User.Role newRole) {
        log.info("Acceso administrativo: cambiando rol de usuario ID {} a {}", userId, newRole);
        userService.updateRole(userId, newRole);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{userId}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long userId) {
        log.info("Acceso administrativo: eliminando usuario ID {}", userId);
        userService.deleteUser(userId);
        return ResponseEntity.noContent().build();
    }
}
