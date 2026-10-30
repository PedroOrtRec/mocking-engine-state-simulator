import { useState } from 'react';
import { SessionStateManager } from '@/features/states/components/SessionStateManager';
import { EndpointList } from '@/features/endpoints/components/EndpointList';

export function MocksPage() {
  const [selectedSessionKey, setSelectedSessionKey] = useState<string>('default');

  return (
    <div className="flex flex-row-reverse gap-6 p-6">
      {/* Selector y card con el estado de la sesión */}
      <div className="w-[30%]">
      <SessionStateManager
        selectedSessionKey={selectedSessionKey}
        onSelectSessionKey={setSelectedSessionKey}
      />
      </div>
      {/* Listado y creación de mocks con cURL vinculado a la sesión activa */}
      <div className="flex-1">
      <EndpointList activeSessionKey={selectedSessionKey} />
      </div>
    </div>
  );
}
