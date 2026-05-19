import { useI18n } from '../i18n';

/** Content-only FAQ rendered inside the in-app tab (no outer nav/header). */
export function FaqContent() {
  const { lang } = useI18n();
  const content = lang === 'fr' ? FR : EN;

  return (
    <div className="faq-tab">
      <header className="faq-tab-hero">
        <div className="eyebrow">{content.kicker}</div>
        <h1>{content.title}</h1>
        <p className="lead">{content.lead}</p>
      </header>

      <section className="faq-section">
        <div className="kicker">{content.basicsKicker}</div>
        <div className="faq-block">{content.basics}</div>
      </section>

      <section className="faq-section">
        <div className="kicker">{content.formulaKicker}</div>
        <div className="formula-card">
          <div className="formula">
            SG = <em>E(avant)</em> − <em>E(après)</em> − 1 − pénalités
          </div>
          <p>{content.formulaExplain}</p>
        </div>
      </section>

      <section className="faq-section">
        <div className="kicker">{content.sectorsKicker}</div>
        <ul className="sector-list">
          {content.sectors.map((s, i) => (
            <li key={i}>
              <strong>{s.name}</strong>
              <span>{s.body}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="faq-section">
        <div className="kicker">{content.qaKicker}</div>
        <div className="qa-list">
          {content.qa.map((item, i) => (
            <details key={i} className="qa">
              <summary>{item.q}</summary>
              <div className="qa-body">{item.a}</div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

// ── French ────────────────────────────────────────────────────────────────

const FR = {
  kicker: 'AIDE & FAQ',
  title: 'Tout comprendre du Strokes Gained',
  lead:
    'Une introduction claire à la statistique, à son calcul, et des réponses aux questions les plus fréquentes sur ShotIQ.',

  basicsKicker: 'LES BASES',
  basics: (
    <>
      <p>
        Le <strong>Strokes Gained (SG)</strong> est une statistique
        popularisée par Mark Broadie. Plutôt que de compter vos coups, elle
        compare votre performance, coup par coup, à une référence : combien
        de coups un joueur de référence prendrait-il, en moyenne, pour
        terminer le trou depuis votre position ?
      </p>
      <p>
        Un coup qui rapproche la balle du trou plus efficacement que la
        moyenne <strong>gagne</strong> des coups (SG positif). Un coup qui
        progresse moins vite que la référence <strong>en perd</strong> (SG
        négatif). Sur une partie complète, la somme indique objectivement où
        vous gagnez et perdez vos points.
      </p>
    </>
  ),

  formulaKicker: 'LA FORMULE',
  formulaExplain:
    'E(avant) = nombre moyen de coups attendus depuis la position avant le coup. E(après) = même chose pour la position d’arrivée (0 si la balle est dans le trou). On retire le coup joué (−1) et les éventuelles pénalités (eau / OB).',

  sectorsKicker: 'LES 4 SECTEURS',
  sectors: [
    {
      name: '⛳ Départ',
      body:
        'Coups de départ sur les pars 4 et 5. La référence dépend de la longueur du trou.',
    },
    {
      name: '🎯 Attaque de green',
      body:
        'Approches au-delà de 30 m, en général depuis le fairway, le rough ou le bunker de fairway.',
    },
    {
      name: '🟢 Autour du green',
      body:
        'Petit jeu et sortie de bunker à moins de 30 m. Les bunkers près du green sont comptés dans ce secteur (et bénéficient d’un barème spécifique).',
    },
    {
      name: '🥏 Putting',
      body:
        'Tous les coups joués sur le green. Saisie manuelle (m + cm) pour économiser la batterie.',
    },
  ],

  qaKicker: 'QUESTIONS FRÉQUENTES',
  qa: [
    {
      q: 'Pourquoi mon Strokes Gained est-il négatif sur ce trou ?',
      a: (
        <p>
          Un SG négatif veut simplement dire que vous avez perdu des coups
          par rapport à votre <em>benchmark</em> (HC ou PRO). Ce n’est pas
          un mauvais score absolu — c’est un écart à la moyenne pour votre
          niveau. Regardez plutôt la <em>tendance</em> session après session
          et le secteur dans lequel l’écart se creuse.
        </p>
      ),
    },
    {
      q: 'Qu’est-ce qu’un “bon” SG ?',
      a: (
        <p>
          0 = vous jouez exactement comme la référence. +1 sur 18 trous est
          déjà très solide à votre niveau. Les pros tournent souvent autour
          de +0,5 à +1,5 SG par tournoi face à la moyenne du tour. L’axe
          utile est l’<strong>évolution</strong> dans le temps.
        </p>
      ),
    },
    {
      q: 'À quoi sert le choix du handicap (HC) ou PRO ?',
      a: (
        <p>
          Il fixe la référence. Un HC 18 attend plus de coups depuis 137 m
          qu’un HC 3. En changeant votre HC, ShotIQ recalcule
          automatiquement tous les coups de la partie en cours.
        </p>
      ),
    },
    {
      q: 'Quelle précision a la mesure GPS ?',
      a: (
        <p>
          ShotIQ garde un suivi GPS haute précision actif pendant la
          partie et fait une moyenne pondérée des meilleurs échantillons à
          chaque STOP. La précision indiquée (±X m) reflète l’accuracy
          réelle de votre appareil. En ciel dégagé, ±3–8 m est typique.
          Sous arbres, attendez quelques secondes ou saisissez la distance
          à la main.
        </p>
      ),
    },
    {
      q: 'Et si le GPS est refusé ou indisponible ?',
      a: (
        <p>
          L’app bascule sur la saisie manuelle (champ “mètres”). Le calcul
          de SG reste identique : seules la mesure de la distance change.
        </p>
      ),
    },
    {
      q: 'Pourquoi le putting est-il en saisie manuelle ?',
      a: (
        <p>
          Sur le green les distances sont courtes (cm comptent) et le GPS
          est trop bruité. Une saisie en mètres + centimètres est plus
          rapide et plus juste. La distance restante d’un putt manqué
          devient automatiquement la longueur du putt suivant.
        </p>
      ),
    },
    {
      q: 'Pourquoi la longueur du trou n’est pas demandée par défaut ?',
      a: (
        <p>
          La référence par défaut selon le par (≈ 155 / 380 / 480 m) suffit
          pour calibrer le coup de départ. La saisie exacte est cachée
          derrière le lien “Modifier” pour réduire les frictions, mais elle
          reste possible si vous voulez plus de précision.
        </p>
      ),
    },
    {
      q: 'Mes données sont-elles synchronisées entre appareils ?',
      a: (
        <p>
          Oui, si vous êtes connecté avec Google. Chaque partie est
          enregistrée dans Supabase au nom de votre compte (lignes
          isolées par utilisateur, RLS). En mode invité, les données
          restent uniquement sur l’appareil.
        </p>
      ),
    },
    {
      q: 'Que se passe-t-il si je joue hors-ligne sur le parcours ?',
      a: (
        <p>
          Tout est enregistré localement. Dès que le réseau revient, ShotIQ
          synchronise automatiquement les parties dans Supabase (file
          d’attente avec re-essais). Vous pouvez jouer une partie complète
          sans aucune connexion.
        </p>
      ),
    },
    {
      q: 'Puis-je modifier ou supprimer un coup après coup ?',
      a: (
        <p>
          Oui. Dans l’historique du trou, le <strong>✕</strong> à droite
          supprime un coup ; les suivants sont renumérotés et le SG du trou
          est recalculé automatiquement.
        </p>
      ),
    },
    {
      q: 'Que voit-on dans la courbe “Strokes Gained par partie” ?',
      a: (
        <p>
          Le SG <em>total</em> de chaque partie, du plus ancien au plus
          récent. C’est la mesure la plus honnête de votre progression :
          au-dessus de zéro, vous battez votre référence sur cette partie.
        </p>
      ),
    },
    {
      q: 'D’où viennent les chiffres de référence (1 m putt, 137 m FW, etc.) ?',
      a: (
        <p>
          Ce sont des tables de strokes attendus dérivées des données PGA
          Tour (Mark Broadie), converties en mètres et ajustées par
          handicap. Le modèle est documenté dans le code et peut être
          affiné — il aligne avec les valeurs de référence d’un HC 3
          (~1,04 pour un putt d’1 m, ~2,98 pour un fer 137 m fairway).
        </p>
      ),
    },
    {
      q: 'Qui a accès à mes données ?',
      a: (
        <p>
          Vous seul. Les politiques Postgres (RLS) sur Supabase isolent
          chaque utilisateur. La clé API publique embarquée dans l’app ne
          permet jamais de lire les données d’un autre joueur.
        </p>
      ),
    },
  ],
};

// ── English ───────────────────────────────────────────────────────────────

const EN: typeof FR = {
  kicker: 'HELP & FAQ',
  title: 'Strokes Gained, explained',
  lead:
    'A clear primer on the metric, how ShotIQ computes it, and answers to the questions players actually ask.',

  basicsKicker: 'THE BASICS',
  basics: (
    <>
      <p>
        <strong>Strokes Gained (SG)</strong>, popularised by Mark Broadie,
        compares your performance shot-by-shot to a reference player: how
        many strokes would the reference, on average, take to finish the
        hole from your position?
      </p>
      <p>
        A shot that moves the ball closer to the hole more efficiently
        than average <strong>gains</strong> strokes (positive SG); a shot
        that makes less progress than the reference <strong>loses</strong>
        them (negative SG). Across a round, the totals show objectively
        where you gain and lose your strokes.
      </p>
    </>
  ),

  formulaKicker: 'THE FORMULA',
  formulaExplain:
    'E(before) = expected number of strokes to hole out from the position before the shot. E(after) = same thing for the landing position (0 if holed). Subtract the stroke played (−1) and any penalty strokes (water / OB).',

  sectorsKicker: 'THE 4 SECTORS',
  sectors: [
    {
      name: '⛳ Off the tee',
      body:
        'Tee shots on par 4s and 5s. The reference depends on the hole length.',
    },
    {
      name: '🎯 Approach',
      body:
        'Shots beyond 30 m, typically from fairway, rough, or fairway bunker.',
    },
    {
      name: '🟢 Around the green',
      body:
        'Short game and greenside bunker, under 30 m. Greenside bunker is folded into this sector (with its own baseline).',
    },
    {
      name: '🥏 Putting',
      body:
        'Every shot on the green. Manual entry (m + cm) to save GPS battery.',
    },
  ],

  qaKicker: 'FREQUENTLY ASKED QUESTIONS',
  qa: [
    {
      q: 'Why is my Strokes Gained negative on this hole?',
      a: (
        <p>
          A negative SG just means you lost shots versus your{' '}
          <em>benchmark</em> (HC or PRO). It's not a bad absolute score —
          it's a gap to the average at your level. Watch the{' '}
          <em>trend</em> session over session and which sector the gap is
          coming from.
        </p>
      ),
    },
    {
      q: 'What counts as a "good" SG?',
      a: (
        <p>
          0 = you played exactly like your reference. +1 over 18 holes is
          already very solid at your level. Tour pros run around +0.5 to
          +1.5 SG per tournament vs the field. The useful axis is the{' '}
          <strong>change</strong> over time.
        </p>
      ),
    },
    {
      q: 'What does selecting a handicap (HC) or PRO change?',
      a: (
        <p>
          It sets the reference. An HC 18 expects more strokes from 137 m
          than an HC 3. Changing your HC re-scores the in-progress round
          automatically.
        </p>
      ),
    },
    {
      q: 'How accurate is the GPS measurement?',
      a: (
        <p>
          ShotIQ keeps a high-accuracy GPS watch warm during the round and
          weighted-averages the best samples on each STOP. The displayed
          accuracy (±X m) reflects the device's real-world accuracy. Under
          open sky, ±3–8 m is typical. Under trees, wait a few seconds or
          enter the distance manually.
        </p>
      ),
    },
    {
      q: 'What if GPS is denied or unavailable?',
      a: (
        <p>
          The app falls back to manual entry (metres field). SG is
          computed identically — only the distance measurement changes.
        </p>
      ),
    },
    {
      q: 'Why is putting entered manually?',
      a: (
        <p>
          On the green the distances are short (centimetres matter) and
          GPS is too noisy. Tapping a distance in metres + centimetres is
          faster and more accurate. A missed putt's leave automatically
          seeds the next putt's distance.
        </p>
      ),
    },
    {
      q: "Why isn't the hole length asked by default?",
      a: (
        <p>
          The par-based default (≈ 155 / 380 / 480 m) is good enough to
          seed the tee-shot reference. The exact input is tucked behind a
          "Customize" link to keep friction low; you can still enter a
          precise value when you want more accuracy.
        </p>
      ),
    },
    {
      q: 'Are my data synced across devices?',
      a: (
        <p>
          Yes, when signed in with Google. Every round is saved to
          Supabase under your account (per-user row-level security). In
          guest mode the data stays only on the device.
        </p>
      ),
    },
    {
      q: 'What happens if I play offline on the course?',
      a: (
        <p>
          Everything is recorded locally. The moment the network returns,
          ShotIQ syncs the rounds to Supabase (retry queue). You can play
          an entire round with no connection at all.
        </p>
      ),
    },
    {
      q: 'Can I edit or delete a shot after recording it?',
      a: (
        <p>
          Yes. In the hole's history, the <strong>✕</strong> on the right
          deletes a shot; later shots are renumbered and the hole's SG is
          re-computed automatically.
        </p>
      ),
    },
    {
      q: 'What does the "Strokes Gained per round" trend show?',
      a: (
        <p>
          The <em>total</em> SG of each round, oldest to newest. It's the
          honest measure of progress: above zero means you beat your
          reference on that round.
        </p>
      ),
    },
    {
      q: 'Where do the benchmarks (1 m putt, 137 m FW…) come from?',
      a: (
        <p>
          They're expected-strokes tables derived from PGA Tour data (Mark
          Broadie), converted to metres and scaled by handicap. The model
          is documented in the code and tunable — it aligns with the
          POC's HC 3 references (≈ 1.04 for a 1 m putt, ≈ 2.98 for a 137 m
          fairway iron).
        </p>
      ),
    },
    {
      q: 'Who can see my data?',
      a: (
        <p>
          Only you. Postgres row-level security on Supabase isolates
          every user; the public API key embedded in the app can never
          read another player's rows.
        </p>
      ),
    },
  ],
};
