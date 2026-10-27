import { useState } from 'react';
import { SessionStateManager } from '@/features/states/components/SessionStateManager';
import { EndpointList } from '@/features/endpoints/components/EndpointList';

export function MocksPage() {
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('default');

  return (
    <div className="space-y-8">
      {/* Selector y card con el estado de la sesión */}
      <SessionStateManager
        selectedSessionKey={selectedSessionKey}
        onSelectSessionKey={setSelectedSessionKey}
      />

      {/* Listado y creación de mocks con cURL vinculado a la sesión activa */}
      <EndpointList activeSessionKey={selectedSessionKey} />
    </div>
  );
}
