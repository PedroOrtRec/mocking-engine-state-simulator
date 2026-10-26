package com.mockengine.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class OpenApiConfigTest {

    private final OpenApiConfig openApiConfig = new OpenApiConfig();

    @Test
    @DisplayName("customOpenAPI debe configurar la información de API y el esquema Bearer JWT")
    void customOpenAPI_ConfiguresInfoAndSecurityScheme() {
        OpenAPI openAPI = openApiConfig.customOpenAPI();

        assertThat(openAPI).isNotNull();
        assertThat(openAPI.getInfo()).isNotNull();
        assertThat(openAPI.getInfo().getTitle()).isEqualTo("Mocking Engine & State Simulator API");
        assertThat(openAPI.getInfo().getVersion()).isEqualTo("2.0.0");
        assertThat(openAPI.getInfo().getContact()).isNotNull();
        assertThat(openAPI.getInfo().getContact().getName()).isEqualTo("Pedro Ortega");

        // Verificación de Requisitos de Seguridad Globales
        assertThat(openAPI.getSecurity()).isNotEmpty();
        assertThat(openAPI.getSecurity().get(0)).containsKey(OpenApiConfig.SECURITY_SCHEME_NAME);

        // Verificación de Componentes de Seguridad (Bearer JWT)
        assertThat(openAPI.getComponents()).isNotNull();
        assertThat(openAPI.getComponents().getSecuritySchemes()).containsKey(OpenApiConfig.SECURITY_SCHEME_NAME);

        SecurityScheme scheme = openAPI.getComponents().getSecuritySchemes().get(OpenApiConfig.SECURITY_SCHEME_NAME);
        assertThat(scheme.getType()).isEqualTo(SecurityScheme.Type.HTTP);
        assertThat(scheme.getScheme()).isEqualTo("bearer");
        assertThat(scheme.getBearerFormat()).isEqualTo("JWT");
    }
}
