import { FormEvent, useState } from 'react';

type PurchaseProps = {
  makePurchaseOffer: (supplierId: string, patientId: string, medicineId: string, price: bigint) => void;
  tokenPurse: Purse;
  walletConnected: boolean;
};

const parseValue = (numeral: string, purse: Purse): bigint => {
  const { decimalPlaces } = purse.displayInfo;
  const num = Number(numeral) * 10 ** decimalPlaces;
  return BigInt(num);
};

const Purchase = ({ makePurchaseOffer, tokenPurse, walletConnected }: PurchaseProps) => {
  const [supplierId, setSupplierId] = useState('');
  const [patientId, setPatientId] = useState('');
  const [medicineId, setMedicineId] = useState('');
  const [price, setPrice] = useState(0n);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    makePurchaseOffer(supplierId, patientId, medicineId, price);
  };

  return (
    <div className="purchase">
      <h3>Purchase Medicine</h3>
      <form onSubmit={handleSubmit}>
        <label>
          Supplier ID:
          <input type="text" value={supplierId} onChange={e => setSupplierId(e.target.value)} required />
        </label>
        <label>
          Patient ID:
          <input type="text" value={patientId} onChange={e => setPatientId(e.target.value)} required />
        </label>
        <label>
          Medicine ID:
          <input type="text" value={medicineId} onChange={e => setMedicineId(e.target.value)} required />
        </label>
        <label>
          Price:
          <input
            type="number"
            value={tokenPurse ? Number(price) / 10 ** tokenPurse.displayInfo.decimalPlaces : 0}
            onChange={e => tokenPurse && setPrice(parseValue(e.target.value, tokenPurse))}
            required
          />
        </label>
        <button type="submit" disabled={!walletConnected}>
          Purchase Medicine
        </button>
      </form>
    </div>
  );
};

export { Purchase };
