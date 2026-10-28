package com.mockengine.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mockengine.dto.state.CreateStateRequest;
import com.mockengine.dto.state.ScenarioStateDTO;
import com.mockengine.dto.state.UpdateStateRequest;
import com.mockengine.entity.ScenarioState;
import com.mockengine.repository.jpa.ScenarioStateRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class StateManagementServiceTest {

    @Mock
    private ScenarioStateRepository scenarioStateRepository;

    @Mock
    private EphemeralSessionRedisService ephemeralSessionRedisService;

    @Spy
    private ObjectMapper objectMapper = new ObjectMapper();

    @InjectMocks
    private StateManagementService stateManagementService;

    // --- CREATE STATE TESTS ---

    @Test
    @DisplayName("createState: crea estado exitosamente con namespace y sessionKey generada")
    void createState_Success() {
        CreateStateRequest request = CreateStateRequest.builder()
                .name("carrito-lleno")
                .stateJson("{\"items\": 3}")
                .build();

        when(scenarioStateRepository.countByOwnerUsername("pedro")).thenReturn(2L);
        when(scenarioStateRepository.existsByOwnerUsernameAndName("pedro", "carrito-lleno")).thenReturn(false);
        when(scenarioStateRepository.save(any(ScenarioState.class))).thenAnswer(invocation -> {
            ScenarioState s = invocation.getArgument(0);
            s.setId(10L);
            return s;
        });

        ScenarioStateDTO result = stateManagementService.createState(request, "pedro");

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(result.getName()).isEqualTo("carrito-lleno");
        assertThat(result.getOwnerUsername()).isEqualTo("pedro");
        assertThat(result.getSessionKey()).isEqualTo("pedro:carrito-lleno");
        assertThat(result.isSystem()).isFalse();
        assertThat(result.getStateJson()).isEqualTo("{\"items\": 3}");

        verify(scenarioStateRepository).save(any(ScenarioState.class));
    }

    @Test
    @DisplayName("createState: falla si el nombre está reservado (default, guest, guest_*)")
    void createState_ReservedName_ThrowsException() {
        CreateStateRequest requestDefault = CreateStateRequest.builder().name("default").build();
        assertThatThrownBy(() -> stateManagementService.createState(requestDefault, "pedro"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("está reservado por el sistema");

        CreateStateRequest requestGuest = CreateStateRequest.builder().name("guest_123").build();
        assertThatThrownBy(() -> stateManagementService.createState(requestGuest, "pedro"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("está reservado por el sistema");
    }

    @Test
    @DisplayName("createState: falla si el usuario ya alcanzó el límite de 5 estados")
    void createState_QuotaExceeded_ThrowsException() {
        CreateStateRequest request = CreateStateRequest.builder().name("nuevo-estado").build();
        when(scenarioStateRepository.countByOwnerUsername("pedro")).thenReturn(5L);

        assertThatThrownBy(() -> stateManagementService.createState(request, "pedro"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Límite alcanzado: cada usuario puede crear un máximo de 5 estados");
    }

    @Test
    @DisplayName("createState: falla si el usuario ya tiene un estado con el mismo nombre")
    void createState_DuplicateName_ThrowsException() {
        CreateStateRequest request = CreateStateRequest.builder().name("duplicado").build();
        when(scenarioStateRepository.countByOwnerUsername("pedro")).thenReturn(1L);
        when(scenarioStateRepository.existsByOwnerUsernameAndName("pedro", "duplicado")).thenReturn(true);

        assertThatThrownBy(() -> stateManagementService.createState(request, "pedro"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Ya tienes un estado registrado con el nombre: duplicado");
    }

    // --- LIST USER STATES ---

    @Test
    @DisplayName("listUserStates: retorna estados del usuario y asegura la existencia del estado default")
    void listUserStates_Success() {
        ScenarioState defaultState = ScenarioState.builder()
                .id(1L)
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .stateJson("{}")
                .build();

        ScenarioState userState = ScenarioState.builder()
                .id(2L)
                .name("mi-estado")
                .ownerUsername("pedro")
                .sessionKey("pedro:mi-estado")
                .system(false)
                .stateJson("{\"foo\":\"bar\"}")
                .build();

        when(scenarioStateRepository.findBySessionKey("default")).thenReturn(Optional.of(defaultState));
        when(scenarioStateRepository.findByOwnerUsernameOrSystemTrue("pedro")).thenReturn(List.of(defaultState, userState));

        List<ScenarioStateDTO> states = stateManagementService.listUserStates("pedro");

        assertThat(states).hasSize(2);
        assertThat(states.get(0).getName()).isEqualTo("default");
        assertThat(states.get(0).isSystem()).isTrue();
        assertThat(states.get(1).getName()).isEqualTo("mi-estado");
        assertThat(states.get(1).getSessionKey()).isEqualTo("pedro:mi-estado");
    }

    // --- GET STATE BY ID ---

    @Test
    @DisplayName("getStateById: retorna estado si pertenece al usuario o es del sistema")
    void getStateById_Success() {
        ScenarioState userState = ScenarioState.builder()
                .id(5L)
                .name("mi-estado")
                .ownerUsername("pedro")
                .sessionKey("pedro:mi-estado")
                .system(false)
                .build();

        when(scenarioStateRepository.findById(5L)).thenReturn(Optional.of(userState));

        ScenarioStateDTO result = stateManagementService.getStateById(5L, "pedro");
        assertThat(result.getId()).isEqualTo(5L);
        assertThat(result.getName()).isEqualTo("mi-estado");
    }

    @Test
    @DisplayName("getStateById: lanza AccessDeniedException si pertenece a otro usuario")
    void getStateById_Forbidden() {
        ScenarioState otherState = ScenarioState.builder()
                .id(5L)
                .name("otro-estado")
                .ownerUsername("maria")
                .sessionKey("maria:otro-estado")
                .system(false)
                .build();

        when(scenarioStateRepository.findById(5L)).thenReturn(Optional.of(otherState));

        assertThatThrownBy(() -> stateManagementService.getStateById(5L, "pedro"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No tienes permiso");
    }

    // --- UPDATE STATE TESTS ---

    @Test
    @DisplayName("updateState: actualiza nombre y JSON, recalculando sessionKey")
    void updateState_Success() {
        ScenarioState existing = ScenarioState.builder()
                .id(5L)
                .name("viejo-nombre")
                .ownerUsername("pedro")
                .sessionKey("pedro:viejo-nombre")
                .stateJson("{}")
                .system(false)
                .build();

        UpdateStateRequest updateReq = UpdateStateRequest.builder()
                .name("nuevo-nombre")
                .stateJson("{\"updated\": true}")
                .build();

        when(scenarioStateRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(scenarioStateRepository.existsByOwnerUsernameAndName("pedro", "nuevo-nombre")).thenReturn(false);
        when(scenarioStateRepository.save(any(ScenarioState.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ScenarioStateDTO updated = stateManagementService.updateState(5L, updateReq, "pedro");

        assertThat(updated.getName()).isEqualTo("nuevo-nombre");
        assertThat(updated.getSessionKey()).isEqualTo("pedro:nuevo-nombre");
        assertThat(updated.getStateJson()).isEqualTo("{\"updated\": true}");
    }

    @Test
    @DisplayName("updateState: rechaza modificar el estado del sistema")
    void updateState_SystemState_ThrowsException() {
        ScenarioState sysState = ScenarioState.builder()
                .id(1L)
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .build();

        when(scenarioStateRepository.findById(1L)).thenReturn(Optional.of(sysState));

        UpdateStateRequest req = UpdateStateRequest.builder().name("nuevo").build();
        assertThatThrownBy(() -> stateManagementService.updateState(1L, req, "pedro"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("El estado del sistema no puede ser modificado ni renombrado");
    }

    @Test
    @DisplayName("updateState: rechaza modificación de estado perteneciente a otro usuario")
    void updateState_NotOwner_ThrowsAccessDenied() {
        ScenarioState otherState = ScenarioState.builder()
                .id(5L)
                .name("test")
                .ownerUsername("maria")
                .system(false)
                .build();

        when(scenarioStateRepository.findById(5L)).thenReturn(Optional.of(otherState));

        UpdateStateRequest req = UpdateStateRequest.builder().name("hacked").build();
        assertThatThrownBy(() -> stateManagementService.updateState(5L, req, "pedro"))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("No tienes permiso");
    }

    // --- DELETE STATE TESTS ---

    @Test
    @DisplayName("deleteState: elimina estado propio correctamente")
    void deleteState_Success() {
        ScenarioState state = ScenarioState.builder()
                .id(5L)
                .name("borrame")
                .ownerUsername("pedro")
                .system(false)
                .build();

        when(scenarioStateRepository.findById(5L)).thenReturn(Optional.of(state));

        stateManagementService.deleteState(5L, "pedro");

        verify(scenarioStateRepository).delete(state);
    }

    @Test
    @DisplayName("deleteState: rechaza eliminar el estado del sistema")
    void deleteState_SystemState_ThrowsException() {
        ScenarioState sysState = ScenarioState.builder()
                .id(1L)
                .name("default")
                .ownerUsername("system")
                .system(true)
                .build();

        when(scenarioStateRepository.findById(1L)).thenReturn(Optional.of(sysState));

        assertThatThrownBy(() -> stateManagementService.deleteState(1L, "pedro"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("El estado del sistema no puede ser eliminado");
    }

    // --- RUNTIME MOCK RESOLUTION TESTS ---

    @Test
    @DisplayName("Sesión regular debe consultar el estado en PostgreSQL")
    void getState_RegularSession_FetchesFromPostgres() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("regular-sess")
                .stateJson("{\"counter\": 5}")
                .build();

        when(scenarioStateRepository.findBySessionKey("regular-sess")).thenReturn(Optional.of(state));

        Map<String, Object> result = stateManagementService.getState("regular-sess");

        assertThat(result).containsEntry("counter", 5);
        verify(scenarioStateRepository).findBySessionKey("regular-sess");
        verifyNoInteractions(ephemeralSessionRedisService);
    }

    @Test
    @DisplayName("Sesión default o vacía debe resolver el estado del sistema de PostgreSQL")
    void getState_DefaultSession_FetchesDefaultSystemState() {
        ScenarioState defaultState = ScenarioState.builder()
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .stateJson("{\"defaultFlag\": true}")
                .build();

        when(scenarioStateRepository.findBySessionKey("default")).thenReturn(Optional.of(defaultState));

        Map<String, Object> result = stateManagementService.getState("default");
        assertThat(result).containsEntry("defaultFlag", true);

        Map<String, Object> resultEmpty = stateManagementService.getState("");
        assertThat(resultEmpty).containsEntry("defaultFlag", true);
    }

    @Test
    @DisplayName("Sesión de invitado (guest_*) debe consultar el estado en Redis")
    void getState_GuestSession_FetchesFromRedis() {
        when(ephemeralSessionRedisService.getGuestState("guest_abc"))
                .thenReturn(Optional.of("{\"guestStep\": \"VERIFIED\"}"));

        Map<String, Object> result = stateManagementService.getState("guest_abc");

        assertThat(result).containsEntry("guestStep", "VERIFIED");
        verify(ephemeralSessionRedisService).getGuestState("guest_abc");
        verifyNoInteractions(scenarioStateRepository);
    }

    @Test
    @DisplayName("Sesión regular debe actualizar el estado en PostgreSQL")
    void updateState_RegularSession_SavesInPostgres() {
        when(scenarioStateRepository.findBySessionKey("regular-sess")).thenReturn(Optional.empty());

        stateManagementService.updateState("regular-sess", Map.of("key", "val"));

        verify(scenarioStateRepository).save(any(ScenarioState.class));
        verify(ephemeralSessionRedisService, never()).saveGuestState(anyString(), anyString());
    }

    @Test
    @DisplayName("Sesión default debe actualizar el estado de sistema en PostgreSQL")
    void updateState_DefaultSession_SavesDefaultStateInPostgres() {
        ScenarioState defaultState = ScenarioState.builder()
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .stateJson("{}")
                .build();

        when(scenarioStateRepository.findBySessionKey("default")).thenReturn(Optional.of(defaultState));

        stateManagementService.updateState("default", Map.of("systemKey", "updated"));

        verify(scenarioStateRepository).save(defaultState);
        assertThat(defaultState.getStateJson()).contains("systemKey");
    }

    @Test
    @DisplayName("Sesión de invitado (guest_*) debe actualizar el estado en Redis")
    void updateState_GuestSession_SavesInRedis() {
        when(ephemeralSessionRedisService.getGuestState("guest_xyz")).thenReturn(Optional.empty());

        stateManagementService.updateState("guest_xyz", Map.of("guestKey", 123));

        verify(ephemeralSessionRedisService).saveGuestState(eq("guest_xyz"), contains("guestKey"));
        verify(scenarioStateRepository, never()).save(any());
    }

    @Test
    @DisplayName("Reset de sesión regular debe eliminar de PostgreSQL")
    void resetState_RegularSession_DeletesFromPostgres() {
        stateManagementService.resetState("regular-sess");

        verify(scenarioStateRepository).deleteBySessionKey("regular-sess");
        verify(ephemeralSessionRedisService, never()).deleteGuestState(anyString());
    }

    @Test
    @DisplayName("Reset de sesión default debe reiniciar stateJson a '{}' en PostgreSQL")
    void resetState_DefaultSession_ResetsStateJson() {
        ScenarioState defaultState = ScenarioState.builder()
                .name("default")
                .ownerUsername("system")
                .sessionKey("default")
                .system(true)
                .stateJson("{\"foo\":\"bar\"}")
                .build();

        when(scenarioStateRepository.findBySessionKey("default")).thenReturn(Optional.of(defaultState));

        stateManagementService.resetState("default");

        verify(scenarioStateRepository).save(defaultState);
        assertThat(defaultState.getStateJson()).isEqualTo("{}");
    }

    @Test
    @DisplayName("Reset de sesión de invitado debe eliminar de Redis")
    void resetState_GuestSession_DeletesFromRedis() {
        stateManagementService.resetState("guest_123");

        verify(ephemeralSessionRedisService).deleteGuestState("guest_123");
        verify(scenarioStateRepository, never()).deleteBySessionKey(anyString());
    }

    // --- APPLY STATE MUTATIONS TESTS (Option 2) ---

    @Test
    @DisplayName("applyStateMutations: string nulo o en blanco devuelve el estado actual sin modificar")
    void applyStateMutations_NullOrBlank_ReturnsCurrentState() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"balance\": 100}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        Map<String, Object> resultNull = stateManagementService.applyStateMutations("user:sess", null);
        assertThat(resultNull).containsEntry("balance", 100);

        Map<String, Object> resultBlank = stateManagementService.applyStateMutations("user:sess", "   ");
        assertThat(resultBlank).containsEntry("balance", 100);

        verify(scenarioStateRepository, never()).save(any());
    }

    @Test
    @DisplayName("applyStateMutations: asignación directa de primitivos y objetos anidados")
    void applyStateMutations_DirectAssignment() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"theme\": \"light\"}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"theme\": \"dark\", \"count\": 5, \"config\": {\"debug\": true}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result)
                .containsEntry("theme", "dark")
                .containsEntry("count", 5);
        @SuppressWarnings("unchecked")
        Map<String, Object> configMap = (Map<String, Object>) result.get("config");
        assertThat(configMap).containsEntry("debug", true);

        verify(scenarioStateRepository).save(state);
        assertThat(state.getStateJson()).contains("\"theme\":\"dark\"");
    }

    @Test
    @DisplayName("applyStateMutations: operador atómico $set")
    void applyStateMutations_AtomicSet() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"user\": \"alice\"}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"user\": {\"$set\": \"bob\"}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result).containsEntry("user", "bob");
    }

    @Test
    @DisplayName("applyStateMutations: operadores atómicos $inc y $dec con números enteros y decimales")
    void applyStateMutations_AtomicIncAndDec() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"stock\": 10, \"balance\": 50.50}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"stock\": {\"$inc\": 5}, \"balance\": {\"$dec\": 20.25}, \"newCounter\": {\"$inc\": 1}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result).containsEntry("stock", 15);
        assertThat(result).containsEntry("balance", 30.25);
        assertThat(result).containsEntry("newCounter", 1);
    }

    @Test
    @DisplayName("applyStateMutations: operador atómico $toggle invierte booleanos")
    void applyStateMutations_AtomicToggle() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"isLoggedIn\": true, \"flag\": false}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"isLoggedIn\": {\"$toggle\": true}, \"flag\": {\"$toggle\": true}, \"fresh\": {\"$toggle\": true}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result).containsEntry("isLoggedIn", false);
        assertThat(result).containsEntry("flag", true);
        assertThat(result).containsEntry("fresh", true);
    }

    @Test
    @DisplayName("applyStateMutations: operador atómico $push añade elementos a listas")
    void applyStateMutations_AtomicPush() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"items\": [\"apple\"]}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"items\": {\"$push\": \"banana\"}, \"tags\": {\"$push\": \"vip\"}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result.get("items")).asList().containsExactly("apple", "banana");
        assertThat(result.get("tags")).asList().containsExactly("vip");
    }

    @Test
    @DisplayName("applyStateMutations: operador atómico $unset elimina la propiedad y la persiste fuera del JSON")
    void applyStateMutations_AtomicUnset() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"tempToken\": \"xyz123\", \"keepMe\": \"active\"}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = "{\"tempToken\": {\"$unset\": true}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result)
                .doesNotContainKey("tempToken")
                .containsEntry("keepMe", "active");

        assertThat(state.getStateJson()).doesNotContain("tempToken");
        assertThat(state.getStateJson()).contains("\"keepMe\":\"active\"");
    }

    @Test
    @DisplayName("applyStateMutations: para sesiones efímeras guest_* persiste en Redis")
    void applyStateMutations_GuestSession_PersistsInRedis() {
        when(ephemeralSessionRedisService.getGuestState("guest_abc"))
                .thenReturn(Optional.of("{\"cart\": 1}"));

        String mutationsJson = "{\"cart\": {\"$inc\": 2}}";
        Map<String, Object> result = stateManagementService.applyStateMutations("guest_abc", mutationsJson);

        assertThat(result).containsEntry("cart", 3);
        verify(ephemeralSessionRedisService).saveGuestState(eq("guest_abc"), contains("\"cart\":3"));
        verify(scenarioStateRepository, never()).save(any());
    }

    @Test
    @DisplayName("applyStateMutations: coerciona tipos explícitos ($type: number, boolean, json) en $set y $push")
    void applyStateMutations_ExplicitTypeCoercion() {
        ScenarioState state = ScenarioState.builder()
                .sessionKey("user:sess")
                .stateJson("{\"ids\": [10]}")
                .build();
        when(scenarioStateRepository.findBySessionKey("user:sess")).thenReturn(Optional.of(state));

        String mutationsJson = """
                {
                  "lastOrderId": {"$set": "42", "$type": "number"},
                  "isVerified": {"$set": "true", "$type": "boolean"},
                  "metadata": {"$set": "{\\"tier\\":\\"gold\\"}", "$type": "json"},
                  "ids": {"$push": "99", "$type": "number"}
                }
                """;

        Map<String, Object> result = stateManagementService.applyStateMutations("user:sess", mutationsJson);

        assertThat(result)
                .containsEntry("lastOrderId", 42)
                .containsEntry("isVerified", true);
        @SuppressWarnings("unchecked")
        Map<String, Object> metadata = (Map<String, Object>) result.get("metadata");
        assertThat(metadata).containsEntry("tier", "gold");
        assertThat(result.get("ids")).asList().containsExactly(10, 99);
    }
}
