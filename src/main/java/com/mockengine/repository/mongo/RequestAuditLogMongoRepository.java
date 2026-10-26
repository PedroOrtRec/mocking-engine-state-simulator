package com.mockengine.repository.mongo;

import com.mockengine.document.RequestAuditLogDocument;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface RequestAuditLogMongoRepository extends MongoRepository<RequestAuditLogDocument, String> {

    // Búsqueda paginada ordenada por fecha más reciente
    Page<RequestAuditLogDocument> findAllByOrderByTimestampDesc(Pageable pageable);

    // Búsqueda paginada por sesión
    Page<RequestAuditLogDocument> findBySessionKeyOrderByTimestampDesc(String sessionKey, Pageable pageable);

    // Búsqueda por propietario (para usuarios regulares e invitados)
    Page<RequestAuditLogDocument> findByOwnerUsernameOrderByTimestampDesc(String ownerUsername, Pageable pageable);

    // Búsqueda por propietario y sesión combinados
    Page<RequestAuditLogDocument> findByOwnerUsernameAndSessionKeyOrderByTimestampDesc(String ownerUsername, String sessionKey, Pageable pageable);

    // Logs recientes por código de error HTTP
    List<RequestAuditLogDocument> findByStatusCodeGreaterThanEqualAndTimestampAfter(int statusCode, Instant since);
}
