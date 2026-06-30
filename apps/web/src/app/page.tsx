import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>Rally Investor Matching MVP</p>
          <h1>Match early-stage founders with relevant investors.</h1>
          <p>
            This foundation will support founder intake, investor validation,
            rule-based scoring, and a CRM-style shortlist for the Noble AI test
            case.
          </p>
        </div>
        <div className={styles.cards} aria-label="MVP workflow">
          <section>
            <span>01</span>
            <h2>Founder profile</h2>
            <p>Capture stage, sector, business model, location, and raise.</p>
          </section>
          <section>
            <span>02</span>
            <h2>Investor scoring</h2>
            <p>Validate activity, fit, check size, and ANZ relevance.</p>
          </section>
          <section>
            <span>03</span>
            <h2>CRM shortlist</h2>
            <p>Show ranked matches with reasons and review notes.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
