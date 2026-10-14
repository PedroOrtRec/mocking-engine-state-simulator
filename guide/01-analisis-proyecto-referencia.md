# Módulo 01: Análisis del Proyecto de Referencia (`back_factinterna`)

Antes de escribir una sola línea de código para el **Mocking Engine & State Simulator**, es fundamental entender cómo se organiza una aplicación Spring Boot profesional en el mundo real. 

Para este análisis examinaremos el proyecto existente en:
`dev/work/adquira/back_factinterna`

---

## 1. El Punto de Entrada de la Aplicación

Toda aplicación Spring Boot comienza con una clase anotada con `@SpringBootApplication` que contiene el método estándar de Java `public static void main(String[] args)`.

### Archivo en el proyecto:
[FacturacionApplication.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/FacturacionApplication.java)

```java
package com.adquira.facturacion;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@ComponentScan(
    basePackages = {"com.adquira.facturacion", "com.adquira.services.core"},
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.ASSIGNABLE_TYPE, 
            classes = com.adquira.services.core.api.security.SecurityConfiguration.class
        )
    }
)
@EntityScan(basePackages = {"com.adquira.facturacion", "com.adquira.services.core"})
@EnableJpaRepositories(basePackages = {"com.adquira.facturacion", "com.adquira.services.core"})
public class FacturacionApplication {

    public static void main(String[] args) {
        SpringApplication.run(FacturacionApplication.class, args);
    }
}
```

### ¿Qué hace cada anotación?
1. **`@SpringBootApplication`**: Es un meta-atributo compuesto por tres anotaciones esenciales:
   - `@Configuration`: Marca la clase como fuente de definiciones de beans en el contexto de Spring.
   - `@EnableAutoConfiguration`: La "magia" de Spring Boot. Examina las librerías en tu `classpath` (ej: si detecta PostgreSQL y Spring MVC, configura automáticamente el `DispatcherServlet` y el pool de conexiones `HikariCP`).
   - `@ComponentScan`: Escanea de forma recursiva todas las clases del paquete actual (`com.adquira.facturacion`) buscando clases anotadas con `@Component`, `@Service`, `@Repository`, `@RestController`, etc., y las registra en el contenedor de inversión de control (IoC).
2. **`@EnableScheduling`**: Habilita la ejecución de tareas periódicas programadas (`@Scheduled` con cron).
3. **`@ComponentScan(basePackages = ...)` & `@EntityScan` & `@EnableJpaRepositories`**: En este proyecto empresarial se usan para escanear múltiples paquetes (el propio de facturación y un paquete compartido corporativo `com.adquira.services.core`).
4. **`SpringApplication.run(FacturacionApplication.class, args)`**: Arranca el servidor embebido (Tomcat por defecto), crea el `ApplicationContext`, inyecta dependencias y deja la aplicación escuchando peticiones.

> [!NOTE]
> En `back_factinterna` también verás un archivo llamado `ServletInitializer.java` y `<packaging>war</packaging>` en `pom.xml`. Esto se debe a que esa aplicación corporativa se despliega en un servidor de aplicaciones JBoss/WildFly tradicional. Para nuestro **Mocking Engine** utilizaremos el estándar moderno: empaquetado **JAR autónomo** con Tomcat embebido dentro de un contenedor Docker.

---

## 2. El Gestor de Dependencias: `pom.xml`

El archivo [pom.xml](file:///Users/pedroortega/dev/work/adquira/back_factinterna/pom.xml) gestiona las librerías y ciclo de compilación con Maven.

### Puntos clave a observar:

1. **Versión de Java:**
   ```xml
   <properties>
       <java.version>21</java.version>
       ...
   </properties>
   ```
   Utiliza **Java 21 LTS**, lo cual nos permite usar características modernas como **Virtual Threads (Project Loom)**, Records, Pattern Matching y Switch Expressions.

2. **Starters de Spring Boot:**
   Spring Boot funciona mediante "Starters" (paquetes preconfigurados de dependencias compatibles entre sí):
   - `spring-boot-starter-web`: Proporciona Spring MVC, Jackson (para serialización JSON) y servidor Tomcat embebido.
   - `spring-boot-starter-data-jpa`: Incluye Hibernate, Spring Data JPA y el pool de conexiones HikariCP.
   - `spring-boot-starter-validation`: Soporte para validar beans con anotaciones `@NotNull`, `@Min`, `@Size`, etc. (Jakarta Bean Validation).
   - `spring-boot-starter-actuator`: Endpoints de observabilidad y salud (`/actuator/health`, `/actuator/metrics`).
   - `postgresql` y `ojdbc11`: Drivers JDBC de base de datos en `scope: runtime`.

3. **Librerías de Utilidad y Productividad:**
   - **Lombok** (`org.projectlombok:lombok`): Genera en tiempo de compilación getters, setters, constructores y métodos `toString()`, reduciendo código repetitivo.
   - **MapStruct** (`org.mapstruct:mapstruct`): Genera código Java seguro en compilación para transformar entidades a DTOs y viceversa.
   - **Log4j2** (`spring-boot-starter-log4j2`): Excluyen el logger por defecto (Logback) para usar Log4j2 mediante configuración en `log4j2.xml`.

---

## 3. Arquitectura en Capas: El Flujo de una Petición

En `back_factinterna` el código está organizado por **módulos de negocio** (ej: `customer`, `invoicing`, `rules`, `audit`). Veamos el módulo [customer](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/customer) para ver la arquitectura clásica:

```
[Cliente HTTP / Postman]
         │
         ▼ (1) JSON Request
┌──────────────────────────────────────────────┐
│  Controller (CompanyController.java)         │  <-- Recibe HTTP, valida params, delega al Service
└──────────────────────┬───────────────────────┘
                       │ (2) Llama métodos de negocio
                       ▼
┌──────────────────────────────────────────────┐
│  Service (CompanyServiceImpl.java)           │  <-- Reglas de negocio, transacciones (@Transactional)
└──────────┬───────────────────────┬───────────┘
           │ (3) Entidad DB        │ (4) Conversión
           ▼                       ▼
┌──────────────────────┐  ┌────────────────────┐
│ Repository           │  │ Mapper (MapStruct) │  <-- Transforma Entity <-> DTO
│ (CompanyRepository)  │  └────────────────────┘
└──────────┬───────────┘
           │ (5) Consultas SQL vía Hibernate
           ▼
┌──────────────────────────────────────────────┐
│  Base de Datos PostgreSQL / Oracle           │
└──────────────────────────────────────────────┘
```

Analicemos cada capa con su archivo correspondiente:

### Capa 1: Controlador REST (Presentation)
**Archivo:** [CompanyController.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/customer/controller/CompanyController.java)

```java
@RestController
@RequiredArgsConstructor
@Slf4j
public class CompanyController implements CompaniesApi {

    private final CompanyService companyService;

    @Override
    public ResponseEntity<PageCompanies> findAllCompanies(Integer page, Integer size, String sort) throws Exception {
        log.info("GET /api/v1/companies - Listando companies: page={}, size={}, sort={}", page, size, sort);
        Pageable pageable = PaginationUtils.createPageable(page, size, sort);
        Page<CompanyDTO> companies = companyService.findAll(pageable);
        return ResponseEntity.ok(mapToPageCompanies(companies));
    }
}
```
- `@RestController`: Combina `@Controller` y `@ResponseBody`. Le dice a Spring que el valor devuelto por cada método debe serializarse directamente en el cuerpo de la respuesta HTTP (habitualmente JSON vía Jackson).
- `@RequiredArgsConstructor`: De Lombok. Crea un constructor con todos los campos `final`, lo que permite a Spring hacer **Inyección de Dependencias por constructor** de forma limpia (sin necesidad de `@Autowired` sobre campos privados, lo cual es una mala práctica moderna).
- `ResponseEntity<T>`: Representa toda la respuesta HTTP (código de estado, cabeceras y cuerpo tipado).

### Capa 2: Servicio de Negocio (Business Logic)
**Archivo:** [CompanyServiceImpl.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/customer/service/CompanyServiceImpl.java)

```java
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository empresaRepository;
    private final CompanyMapper empresaMapper;

    @Override
    public Page<CompanyDTO> findAll(Pageable pageable) {
        log.debug("Buscando todas las empresas con paginación: {}", pageable);
        return empresaRepository.findAll(pageable)
                .map(empresaMapper::toDTO);
    }
}
```
- `@Service`: Marca la clase como un componente de servicio en el contenedor IoC.
- `@Transactional(readOnly = true)`: Controla los límites de transacción de base de datos. Al ser `readOnly = true`, Hibernate optimiza las lecturas desactivando el "dirty-checking" automático.

### Capa 3: Repositorio de Datos (Data Access)
**Archivo:** [CompanyRepository.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/customer/repository/CompanyRepository.java)

```java
@Repository
public interface CompanyRepository extends JpaRepository<Company, Long>, JpaSpecificationExecutor<Company> {
    
    Optional<Company> findByNif(String nif);

    List<Company> findByNifIn(Collection<String> nifs);
}
```
- ¡Es solo una interfaz! No hay código SQL escrito a mano.
- Al extender `JpaRepository<Company, Long>`, Spring Data JPA implementa automáticamente en tiempo de ejecución métodos como `findAll()`, `findById()`, `save()`, `delete()`.
- **Query Methods por convención**: Spring interpreta el nombre del método `findByNif` y genera automáticamente la consulta: `SELECT * FROM COMPANY WHERE NIF = ?`.

### Capa 4: Entidad de Persistencia (Domain)
**Archivo:** [Company.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/customer/entity/Company.java)

```java
@Entity
@Table(name = "COMPANY", schema = "ECCONTRACT")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Company {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ID", nullable = false)
    private Long id;

    @Column(name = "BUSINESS_NAME", length = 765, nullable = false)
    private String businessName;

    @Column(name = "NIF", length = 52, nullable = false)
    private String nif;
    ...
}
```
- `@Entity`: Define la clase como una entidad relacional gestionada por Hibernate/JPA.
- `@Table`: Especifica el nombre de la tabla en base de datos.
- `@Id` y `@GeneratedValue`: Clave primaria con autoincremento.

---

## 4. Manejo Global de Errores: `@ControllerAdvice` y RFC 7807

Una de las partes mejor resueltas en `back_factinterna` es el tratamiento uniforme de errores.

**Archivo:** [UserManagementExceptionHandler.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/main/java/com/adquira/facturacion/shared/exception/UserManagementExceptionHandler.java)

```java
@ControllerAdvice
@Slf4j
public class UserManagementExceptionHandler extends ResponseEntityExceptionHandler {
    
    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleUserNotFoundException(UserNotFoundException ex, HttpServletRequest request) {
        logHandledError("User not found", ex);
        
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("User Not Found");
        problem.setInstance(URI.create(request.getRequestURI()));
        problem.setProperty("code", "USER_NOT_FOUND");
        problem.setProperty("timestamp", Instant.now());
        
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }
}
```
- En lugar de retornar un error 500 feo o formatos arbitrarios, usa **`ProblemDetail`** (el estándar oficial **RFC 7807**, introducido nativamente en Spring Framework 6 / Spring Boot 3).
- Cualquier controlador que lance una excepción `UserNotFoundException` será interceptado automáticamente por este advice, devolviendo un HTTP 404 estandarizado.

---

## 5. Estrategia de Pruebas (Unitarias vs Integración)

En `back_factinterna` observarás dos tipos de tests en `src/test/java`:

1. **Tests Unitarios Rápidos:**
   - **Archivo:** [CompanyControllerTest.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/test/java/com/adquira/facturacion/customer/controller/CompanyControllerTest.java)
   - Usa `@ExtendWith(MockitoExtension.class)`, `@Mock` para simular el servicio y `@InjectMocks` para el controlador.
   - Se ejecutan en milisegundos sin levantar ningún servidor ni base de datos.

2. **Tests de Integración con Servidor Real:**
   - **Archivo:** [CompanyControllerIT.java](file:///Users/pedroortega/dev/work/adquira/back_factinterna/src/test/java/com/adquira/facturacion/customer/controller/CompanyControllerIT.java)
   - Usa `@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)`.
   - Levanta el contexto completo de Spring Boot, un puerto HTTP aleatorio, y usa `TestRestTemplate` o `WebTestClient` para realizar peticiones HTTP reales contra el servidor.

---

## 6. Comparativa: ¿Qué adoptamos y qué cambia en nuestro Mocking Engine?

| Característica | Proyecto de Referencia (`back_factinterna`) | Nuestro Proyecto (`mocking-engine-state-simulator`) |
| :--- | :--- | :--- |
| **Java** | Java 21 | Java 21 LTS |
| **Empaquetado** | WAR para WildFly/JBoss | **JAR ejecutable** estándar + Docker |
| **Endpoints** | Estáticos y fuertemente tipados (OpenAPI spec) | **Dinámicos**: rutas creadas en tiempo de ejecución registradas en BD |
| **Enrutamiento** | `@GetMapping("/api/v1/companies")` convencional | **Custom Dynamic Dispatcher** (`/mock/**`) con matching de patrones |
| **Payloads** | Clases Java fijas (`CompanyDTO`, etc.) | **Jackson `JsonNode` dinámico** + plantillas con variables |
| **Concurrencia** | Pool clásico de hilos | **Virtual Threads** de Java 21 para latencias artificiales de 3G/4G |
| **Base de Datos** | Oracle + PostgreSQL | **PostgreSQL puro** en Docker con almacenamiento JSONB |

Ahora que tenemos claro el estándar de la industria, avancemos al **[Módulo 02: Setup Inicial con Docker y PostgreSQL](./02-setup-inicial-docker-postgresql.md)**.
