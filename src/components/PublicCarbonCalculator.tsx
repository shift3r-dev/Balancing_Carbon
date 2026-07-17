import CarbonEngineUI from './CarbonEngineUI.tsx';

interface PublicCarbonCalculatorProps {
  onRegister?: () => void;
}

export default function PublicCarbonCalculator({ onRegister }: PublicCarbonCalculatorProps) {
  return (
    <div className="public-scope-calculator">
      <section className="public-scope-calculator-intro">
        <div>
          <span>Interactive carbon accounting</span>
          <h1>Calculate Scope 1, Scope 2 and Scope 3 emissions.</h1>
        </div>
        <p>Select an activity source, approved factor and unit to create a transparent emissions estimate. The public calculator never writes to an organisation ledger.</p>
      </section>
      <div className="public-scope-calculator-shell">
        <CarbonEngineUI scopeType="all" facilities={[]} records={[]} publicMode onRegister={onRegister} />
      </div>
      <p className="public-scope-calculator-note">Public estimates are educational and pre-assessment outputs. Final inventories require organisational boundaries, evidence review, approved factor selection and controlled ledger records.</p>
    </div>
  );
}
