import { FormEvent, useState } from 'react';

type ConsultationProps = {
  makeConsultationOffer: (doctorId: string, patientId: string, fee: bigint) => void;
  tokenPurse: Purse;
  walletConnected: boolean;
};

const parseValue = (numeral: string, purse: Purse): bigint => {
  const { decimalPlaces } = purse.displayInfo;
  const num = Number(numeral) * 10 ** decimalPlaces;
  return BigInt(num);
};

const Consultation = ({ makeConsultationOffer, tokenPurse, walletConnected }: ConsultationProps) => {
  const [doctorId, setDoctorId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [fee, setFee] = useState(0n);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    makeConsultationOffer(doctorId, patientId, fee);
  };

  return (
    <div className="consultation">
      <h3>Consultation</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Doctor ID:
          <input type="text" value={doctorId} onChange={e => setDoctorId(e.target.value)} required />
        </label>
        <label>
          Patient ID:
          <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)} required />
        </label>
        <label>
          Fee:
          <input
            type="number"
            value={tokenPurse && tokenPurse.displayInfo ? Number(fee) / 10 ** tokenPurse.displayInfo.decimalPlaces : 0}
            onChange={e => setFee(tokenPurse && tokenPurse.displayInfo ? parseValue(e.target.value, tokenPurse) : 0n)}
            required
          />
        </label>
        <button type="submit" disabled={!walletConnected}>
          Initiate Consultation
        </button>
      </form>
    </div>
  );
};

export { Consultation };
