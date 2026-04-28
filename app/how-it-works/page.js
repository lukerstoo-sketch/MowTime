import Link from "next/link";
import styles from "../page.module.css";

export default function HowItWorksPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.cardShell}>
          <h1 className={styles.title}>How MowTime Works</h1>

          <p className={styles.subtitle}>
            MowTime estimates the best mowing windows by looking at weather,
            yard conditions, and your last mow date.
          </p>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitleList}>What improves a score?</h2>
            <p className={styles.reason}>
              MowTime favors dry conditions, low rain risk, manageable humidity,
              light wind, comfortable temperatures, and good daytime mowing hours.
            </p>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitleList}>What lowers a score?</h2>
            <p className={styles.reason}>
              Recent rain, rain coming soon, high humidity, strong wind, extreme
              temperatures, and mowing too soon after the last cut can lower a
              window’s score.
            </p>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitleList}>How does my last mow date matter?</h2>
            <p className={styles.reason}>
              If you mowed recently, MowTime avoids pushing immediate windows too
              aggressively. If it has been several days, sooner good windows may
              be prioritized.
            </p>
          </section>

          <section className={styles.infoCard}>
            <h2 className={styles.sectionTitleList}>Important note</h2>
            <p className={styles.reason}>
              MowTime is a practical guide, not a perfect lawn science model.
              Always use your own judgment based on how your yard actually looks
              and feels.
            </p>
          </section>

          <Link href="/" className={styles.smallLink}>
            ← Back to MowTime
          </Link>
        </div>
      </div>
    </main>
  );
}