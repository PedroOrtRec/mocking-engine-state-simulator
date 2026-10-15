package com.mockengine.repository;

import com.mockengine.entity.RequestAuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RequestAuditLogRepository extends JpaRepository<RequestAuditLog, Long> {

    Page<RequestAuditLog> findBySessionKeyOrderByTimestampDesc(String sessionKey, Pageable pageable);

    Page<RequestAuditLog> findAllByOrderByTimestampDesc(Pageable pageable);
}
