package com.mockengine.document;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.Instant;
import java.util.Map;

@Document(collection = "request_audit_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RequestAuditLogDocument {

    @Id
    private String id; // En MongoDB los identificadores son típicamente ObjectId hex

    @Indexed
    @Field("session_key")
    private String sessionKey;

    @Indexed
    @Field("owner_username")
    private String ownerUsername;

    @Field("http_method")
    private String httpMethod;

    @Field("request_uri")
    private String requestUri;

    @Field("status_code")
    private int statusCode;

    @Field("duration_ms")
    private long durationMs;

    @Field("request_headers")
    private Map<String, String> requestHeaders;

    @Field("request_body")
    private String requestBody;

    @Field("response_body")
    private String responseBody;

    @Indexed
    @Field("timestamp")
    @Builder.Default
    private Instant timestamp = Instant.now();
}
