package com.mockengine.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    public static final String SECURITY_SCHEME_NAME = "BearerAuth";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Mocking Engine & State Simulator API")
                        .version("2.0.0")
                        .description("Motor dinámico de simulación de APIs, ingeniería de caos, aislamiento multitenant y persistencia políglota para equipos Frontend y Mobile.")
                        .contact(new Contact().name("Pedro Ortega"))
                        .license(new License().name("MIT License").url("https://opensource.org/licenses/MIT")))
                // Registra el requisito de seguridad global (botón Authorize en Swagger UI)
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME, new SecurityScheme()
                                .name(SECURITY_SCHEME_NAME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Introduce tu token JWT obtenido en /api/v1/auth/login o /api/v1/auth/guest")));
    }
}
