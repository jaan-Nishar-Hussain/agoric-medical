// Import Agoric Zoe and other required modules
import { E } from '@agoric/eventual-send';
import { AmountMath } from '@agoric/ertp';

// Define the contract
export const start = async zcf => {
  const { brands, issuers } = zcf.getTerms();
  const platformFee = AmountMath.make(brands.Token, 5n); // Platform commission: 5%

  // Store doctors, patients, and suppliers
  const doctors = new Map(); // Map<doctorId, {publicFacet, depositFacet}>
  const suppliers = new Map(); // Map<supplierId, {publicFacet, depositFacet}>
  const patients = new Map(); // Map<patientId, {depositFacet, balance}>

  // Helper to calculate net amount after fee
  const calculateNetAmount = amount => AmountMath.subtract(amount, platformFee);

  // Patient-Doctor Consultation
  const createConsultationInvitation = () => {
    return zcf.makeInvitation(({ seat }) => {
      const { doctorId, patientId } = seat.getProposal().custom;
      if (!doctors.has(doctorId)) {
        throw new Error('Invalid doctor ID');
      }
      if (!patients.has(patientId)) {
        throw new Error('Invalid patient ID');
      }
      const doctor = doctors.get(doctorId);
      const paymentAmount = seat.getAmountAllocated('Fee', brands.Token);
      const netAmount = calculateNetAmount(paymentAmount);

      // Ensure patient has enough balance
      const patient = patients.get(patientId);
      if (AmountMath.isGTE(patient.balance, paymentAmount) === false) {
        throw new Error('Insufficient patient balance');
      }

      // Deduct fee from patient balance
      patient.balance = AmountMath.subtract(patient.balance, paymentAmount);
      seat.exit();

      // Deposit net amount to the doctor's account
      E(doctor.depositFacet).receive(netAmount);
      return harden({
        message: `Consultation initiated between patient ${patientId} and doctor ${doctorId}`,
        validFor: 12 * 60 * 60 * 1000, // 12 hours in ms
      });
    }, 'Consult Doctor');
  };

  // Medicine Purchase
  const createPurchaseInvitation = () => {
    return zcf.makeInvitation(({ seat }) => {
      const { supplierId, patientId, medicineId } = seat.getProposal().custom;
      if (!suppliers.has(supplierId)) {
        throw new Error('Invalid supplier ID');
      }
      if (!patients.has(patientId)) {
        throw new Error('Invalid patient ID');
      }
      const supplier = suppliers.get(supplierId);
      const paymentAmount = seat.getAmountAllocated('Price', brands.Token);
      const netAmount = calculateNetAmount(paymentAmount);

      // Ensure patient has enough balance
      const patient = patients.get(patientId);
      if (AmountMath.isGTE(patient.balance, paymentAmount) === false) {
        throw new Error('Insufficient patient balance');
      }

      // Deduct payment from patient balance
      patient.balance = AmountMath.subtract(patient.balance, paymentAmount);
      seat.exit();

      // Deposit net amount to the supplier's account
      E(supplier.depositFacet).receive(netAmount);
      return harden({
        message: `Purchase of medicine ${medicineId} from supplier ${supplierId} successful`,
      });
    }, 'Purchase Medicine');
  };

  // Add Doctor
  const addDoctor = (doctorId, depositFacet) => {
    if (doctors.has(doctorId)) {
      throw new Error('Doctor ID already exists');
    }
    doctors.set(doctorId, { depositFacet });
  };

  // Add Supplier
  const addSupplier = (supplierId, depositFacet) => {
    if (suppliers.has(supplierId)) {
      throw new Error('Supplier ID already exists');
    }
    suppliers.set(supplierId, { depositFacet });
  };

  // Add Patient
  const addPatient = (patientId, depositFacet, initialBalance) => {
    if (patients.has(patientId)) {
      throw new Error('Patient ID already exists');
    }
    patients.set(patientId, {
      depositFacet,
      balance: AmountMath.make(brands.Token, initialBalance),
    });
  };

  const publicFacet = harden({
    createConsultationInvitation,
    createPurchaseInvitation,
    addDoctor,
    addSupplier,
    addPatient,
  });

  return harden({ publicFacet });
};
