import React, { useState } from 'react';
import { Plus, CheckCircle, Lock } from 'lucide-react';
import { SupervisionConsultantContract, User } from '../types';

interface Props {
  projectId: string;
  contracts: SupervisionConsultantContract[];
  currentUser: User | null;
  onRefresh: () => void;
}

export const SupervisionConsultantContractTable: React.FC<Props> = ({ projectId, contracts, currentUser, onRefresh }) => {
  const [newContract, setNewContract] = useState<Partial<SupervisionConsultantContract>>({ position: '', rate: 0, unit: '', total: 0 });

  const isDirectorateAdmin = currentUser?.role === 'directorate_admin';
  const canSubmit = !isDirectorateAdmin; // Authorized users can submit

  const handleAdd = async () => {
    if (!newContract.position || !newContract.rate || !newContract.unit) return;
    const total = newContract.rate * (newContract.rate || 0); // Simplified total calculation
    
    await fetch(`/api/projects/${projectId}/supervision-consultant-contracts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newContract, total })
    });
    onRefresh();
    setNewContract({ position: '', rate: 0, unit: '', total: 0 });
  };

  const handleApprove = async (contractId: string) => {
    if (!isDirectorateAdmin) return;
    await fetch(`/api/projects/${projectId}/supervision-consultant-contracts/${contractId}/approve`, {
      method: 'POST'
    });
    onRefresh();
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Supervision Consultant Service Contract Amount</h3>
      <table className="w-full border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-100">
            <th className="border p-2">Position</th>
            <th className="border p-2">Rate</th>
            <th className="border p-2">Unit</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {contracts.map(c => (
            <tr key={c.id}>
              <td className="border p-2">{c.position}</td>
              <td className="border p-2">{c.rate}</td>
              <td className="border p-2">{c.unit}</td>
              <td className="border p-2">{c.total}</td>
              <td className="border p-2">{c.status}</td>
              <td className="border p-2">
                {c.status !== 'Approved' && isDirectorateAdmin && (
                  <button onClick={() => handleApprove(c.id)} className="text-green-600"><CheckCircle /></button>
                )}
                {c.status === 'Approved' && <Lock className="text-gray-500" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {canSubmit && (
        <div className="flex gap-2">
          <input placeholder="Position" onChange={e => setNewContract({...newContract, position: e.target.value})} className="border p-1" />
          <input type="number" placeholder="Rate" onChange={e => setNewContract({...newContract, rate: Number(e.target.value)})} className="border p-1" />
          <input placeholder="Unit" onChange={e => setNewContract({...newContract, unit: e.target.value})} className="border p-1" />
          <button onClick={handleAdd} className="bg-blue-600 text-white p-2 rounded"><Plus /></button>
        </div>
      )}
    </div>
  );
};
