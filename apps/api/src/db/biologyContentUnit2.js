/**
 * Biology for Computer Engineers (BOT26105), Unit II: Biomolecules and Enzymes. Faculty-authored
 * demo content, seeded as published. No videos yet: faculty add them in the studio.
 */
import { hook, mcq } from './biologyContentHelpers.js';

export const BIOLOGY_UNIT2 = {
  carbohydrates: {
    curiosity:
      'Paper, cotton T-shirts and the rice on your plate are all made of the same sugar, glucose. Why can you digest rice but not paper?',
    curiosityQuestion: hook(
      'Starch and cellulose are both made of glucose. Why can humans digest starch but not cellulose?',
      [
        'The glucose units are linked differently (α vs β bonds), and we have no enzyme for β bonds',
        'Cellulose has no glucose in it',
        'Cellulose is a protein',
      ],
      0,
      'Amylase breaks α-1,4 bonds in starch; humans lack cellulase to break the β-1,4 bonds in cellulose.',
    ),
    easy: '**Carbohydrates** are made of carbon, hydrogen and oxygen, usually in the ratio **(CH₂O)ₙ**. They are the body’s main fuel.\n\nThree sizes:\n\n- **Monosaccharides** — single sugars: **glucose**, fructose, galactose.\n- **Disaccharides** — two sugars joined: **sucrose** (table sugar = glucose + fructose), **lactose** (milk sugar), maltose.\n- **Polysaccharides** — long chains:\n  - **Starch** — energy store in plants (rice, potato).\n  - **Glycogen** — energy store in animals (liver, muscle).\n  - **Cellulose** — structure in plant cell walls (cotton, paper, wood).\n  - **Chitin** — insect shells and fungal walls.\n\nSugars join by a **glycosidic bond**, releasing water (condensation).',
    tenMark:
      '## Introduction\nCarbohydrates are polyhydroxy aldehydes or ketones, or substances that yield them on hydrolysis. General formula (CH₂O)ₙ. They are the most abundant biomolecules on Earth.\n\n## Classification\n### 1. Monosaccharides\nSimple sugars that cannot be hydrolysed further.\n- By carbon number: trioses (glyceraldehyde), pentoses (ribose, deoxyribose), hexoses (glucose, fructose, galactose).\n- By functional group: aldoses (glucose, an aldehyde) and ketoses (fructose, a ketone).\n\n### 2. Disaccharides\nTwo monosaccharides joined by a glycosidic bond.\n| Disaccharide | Units | Source |\n|---|---|---|\n| Sucrose | Glucose + fructose | Sugarcane |\n| Lactose | Glucose + galactose | Milk |\n| Maltose | Glucose + glucose | Germinating grain |\n\n### 3. Polysaccharides\n| Polysaccharide | Unit and bond | Function |\n|---|---|---|\n| Starch (amylose + amylopectin) | α-glucose, α-1,4 and α-1,6 | Plant energy store |\n| Glycogen | α-glucose, highly branched | Animal energy store |\n| Cellulose | β-glucose, β-1,4 | Plant cell wall |\n| Chitin | N-acetylglucosamine | Exoskeleton, fungal wall |\n\n## Functions\n1. **Energy source:** 1 g gives about 4 kcal; glucose is oxidised to make ATP.\n2. **Energy storage:** starch and glycogen.\n3. **Structural:** cellulose and chitin.\n4. **Components of nucleic acids:** ribose and deoxyribose.\n5. **Cell recognition:** glycoproteins and glycolipids on membranes.\n\n## Conclusion\nFrom fuel to fibre, carbohydrates power cells and build materials used in food, paper, textile and biofuel industries.',
    realWorld:
      '- **Bioethanol** for E20 petrol in India is made by fermenting sugarcane molasses and grain starch.\n- **Glucometers** measure blood glucose for diabetics using an enzyme biosensor.\n- **Cellulose** becomes paper, cotton textiles and biodegradable packaging.\n- **Chitosan** from prawn shells is used in water filters and wound dressings.',
    flashcards: [
      ['General formula of carbohydrates?', '(CH₂O)ₙ'],
      ['Sucrose is made of?', 'Glucose + fructose.'],
      ['Energy store in plants vs animals?', 'Starch in plants, glycogen in animals.'],
      [
        'Why can’t humans digest cellulose?',
        'We lack cellulase to break its β-1,4 glycosidic bonds.',
      ],
      ['Bond between two sugars?', 'Glycosidic bond, formed by condensation (loss of water).'],
    ],
    mcqs: [
      mcq(
        'Which is a monosaccharide?',
        [
          ['Sucrose', 'Sucrose is a disaccharide.'],
          ['Glucose', 'Correct.'],
          ['Starch', 'Starch is a polysaccharide.'],
          ['Lactose', 'Lactose is a disaccharide.'],
        ],
        1,
        'Glucose is a single sugar unit (hexose).',
      ),
      mcq(
        'Animals store carbohydrate as…',
        [
          ['Starch', 'Starch is the plant store.'],
          ['Cellulose', 'Cellulose is structural in plants.'],
          ['Glycogen', 'Correct.'],
          ['Chitin', 'Chitin is structural.'],
        ],
        2,
        'Glycogen is stored in the liver and muscles.',
      ),
      mcq(
        'Lactose is made of…',
        [
          ['Glucose + glucose', 'That is maltose.'],
          ['Glucose + fructose', 'That is sucrose.'],
          ['Glucose + galactose', 'Correct.'],
          ['Fructose + galactose', 'No common disaccharide.'],
        ],
        2,
        'Lactose, the milk sugar, is glucose + galactose.',
        'medium',
      ),
      mcq(
        'Cellulose is made of…',
        [
          ['α-glucose', 'α-glucose forms starch and glycogen.'],
          ['β-glucose', 'Correct.'],
          ['Fructose', 'Fructose is not the unit of cellulose.'],
          ['Amino acids', 'Amino acids form proteins.'],
        ],
        1,
        'β-1,4 linked glucose forms straight chains that pack into strong fibres.',
        'medium',
      ),
      mcq(
        'Energy from 1 g of carbohydrate is about…',
        [
          ['4 kcal', 'Correct.'],
          ['9 kcal', 'That is fat.'],
          ['1 kcal', 'Too low.'],
          ['20 kcal', 'Too high.'],
        ],
        0,
        'Carbohydrates and proteins give about 4 kcal/g; fats about 9 kcal/g.',
      ),
    ],
  },

  proteins: {
    curiosity:
      'A boiled egg white turns from clear to white and never goes back. Nothing was added and nothing was taken away. What changed inside?',
    curiosityQuestion: hook(
      'Why does an egg white turn solid and white when boiled?',
      [
        'Heat denatures the proteins: they unfold and clump together',
        'Water turns into protein',
        'The egg gains carbon from the flame',
      ],
      0,
      'Heat breaks the weak bonds that hold the protein shape; unfolded chains tangle together. This is denaturation.',
    ),
    easy: '**Proteins** are long chains of **amino acids** joined by **peptide bonds**. There are **20** amino acids, and their order decides the protein.\n\nA protein folds into a precise 3-D shape, and **shape decides function**:\n\n1. **Primary** — the sequence of amino acids (like letters in a word).\n2. **Secondary** — local coils (**α-helix**) and folds (**β-sheet**) held by hydrogen bonds.\n3. **Tertiary** — the whole chain folded into a 3-D shape.\n4. **Quaternary** — several chains joined (e.g. **haemoglobin** has 4).\n\nProteins do most of the work in a cell: enzymes, hormones (insulin), transport (haemoglobin), defence (antibodies), structure (keratin, collagen) and movement (actin, myosin).\n\nHeat, strong acid or alkali can **denature** a protein: it unfolds and stops working.',
    tenMark:
      '## Introduction\nProteins are polymers of amino acids linked by peptide bonds. They make up about 50% of the dry weight of a cell and perform most cellular functions.\n\n## Amino acids\nEach amino acid has a central carbon bonded to an amino group (–NH₂), a carboxyl group (–COOH), a hydrogen and a variable **R group**. 20 standard amino acids; 9 are *essential* (must come from food).\n\n## Peptide bond\nThe –COOH of one amino acid joins the –NH₂ of the next, releasing water (condensation). A chain of many is a **polypeptide**.\n\n## Levels of structure\n| Level | Description | Bonds |\n|---|---|---|\n| Primary | Linear sequence of amino acids | Peptide bonds |\n| Secondary | α-helix, β-pleated sheet | Hydrogen bonds |\n| Tertiary | 3-D folding of one chain | H-bonds, ionic, disulphide, hydrophobic |\n| Quaternary | Two or more chains together | Same as tertiary |\n\n## Classification by shape\n- **Fibrous:** long, insoluble, structural — keratin, collagen.\n- **Globular:** compact, soluble, functional — enzymes, haemoglobin, antibodies.\n\n## Functions\n1. Catalysis — enzymes (amylase).\n2. Transport — haemoglobin carries O₂.\n3. Hormones — insulin controls blood sugar.\n4. Defence — antibodies.\n5. Structure — collagen, keratin.\n6. Movement — actin, myosin.\n7. Receptors and channels in membranes.\n\n## Denaturation\nLoss of 3-D structure (and function) due to heat, pH change, heavy metals or chemicals. The primary structure stays intact.\n\n## Conclusion\nThe sequence → shape → function principle is the basis of drug design and protein engineering.',
    realWorld:
      '- **AlphaFold** (DeepMind) uses AI to predict protein 3-D structure from sequence — a Nobel Prize-winning computing breakthrough (2024).\n- **Recombinant insulin** is a protein made by engineered bacteria.\n- **Antibody tests** (rapid antigen kits) use proteins to detect viruses.\n- **Protein-based plastics and silk** are being engineered as green materials.',
    flashcards: [
      ['Monomer of proteins?', 'Amino acids (20 standard).'],
      ['Bond between amino acids?', 'Peptide bond.'],
      ['Four levels of protein structure?', 'Primary, secondary, tertiary, quaternary.'],
      ['Denaturation?', 'Loss of a protein’s 3-D shape and function due to heat, pH or chemicals.'],
      ['Example of quaternary structure?', 'Haemoglobin (four polypeptide chains).'],
    ],
    mcqs: [
      mcq(
        'The bond joining amino acids is the…',
        [
          ['Glycosidic bond', 'That joins sugars.'],
          ['Peptide bond', 'Correct.'],
          ['Ester bond', 'That is in lipids.'],
          ['Phosphodiester bond', 'That is in nucleic acids.'],
        ],
        1,
        'A peptide bond links the carboxyl of one amino acid to the amino group of the next.',
      ),
      mcq(
        'The α-helix is part of the… structure',
        [
          ['Primary', 'Primary is the sequence.'],
          ['Secondary', 'Correct.'],
          ['Tertiary', 'Tertiary is the full 3-D fold.'],
          ['Quaternary', 'Quaternary is multiple chains.'],
        ],
        1,
        'α-helices and β-sheets are secondary structures held by hydrogen bonds.',
      ),
      mcq(
        'Which protein carries oxygen in blood?',
        [
          ['Insulin', 'Insulin is a hormone.'],
          ['Keratin', 'Keratin is in hair and nails.'],
          ['Haemoglobin', 'Correct.'],
          ['Amylase', 'Amylase digests starch.'],
        ],
        2,
        'Haemoglobin in red blood cells binds O₂.',
      ),
      mcq(
        'Denaturation changes a protein’s…',
        [
          ['Amino acid sequence', 'Peptide bonds stay intact.'],
          ['3-D shape', 'Correct.'],
          ['Number of amino acids', 'No amino acids are lost.'],
          ['Elements', 'Atoms are unchanged.'],
        ],
        1,
        'Weak bonds break and the protein unfolds; the primary structure remains.',
        'medium',
      ),
      mcq(
        'Collagen is an example of a…',
        [
          ['Globular protein', 'Globular proteins are compact and soluble.'],
          ['Fibrous protein', 'Correct.'],
          ['Carbohydrate', 'Collagen is a protein.'],
          ['Lipid', 'Collagen is a protein.'],
        ],
        1,
        'Collagen forms strong fibres in skin, tendons and bone.',
        'medium',
      ),
    ],
  },

  lipids: {
    curiosity:
      'Oil and water never mix, yet your body is about 60% water and every cell is wrapped in an oily layer. How do cells use oil to their advantage?',
    curiosityQuestion: hook(
      'Why do lipids not dissolve in water?',
      [
        'They are mostly non-polar hydrocarbon chains',
        'They are too heavy',
        'They are made of amino acids',
      ],
      0,
      'Long non-polar hydrocarbon chains cannot form hydrogen bonds with water, so lipids are hydrophobic.',
    ),
    easy: '**Lipids** are fats, oils and related molecules that **do not dissolve in water** (hydrophobic) but dissolve in organic solvents.\n\nMain types:\n\n- **Triglycerides (fats and oils)** — 1 **glycerol** + 3 **fatty acids**. Store energy (9 kcal/g, more than double carbohydrates).\n  - **Saturated** fatty acids (no C=C double bonds): solid at room temperature, e.g. ghee, butter.\n  - **Unsaturated** (one or more C=C): liquid oils, e.g. sunflower oil.\n- **Phospholipids** — glycerol + 2 fatty acids + phosphate head. Build **cell membranes**.\n- **Steroids** — four fused rings: **cholesterol**, hormones (testosterone, oestrogen).\n- **Waxes** — waterproof coatings on leaves and feathers.\n\nLipids also **insulate** the body and protect organs.',
    tenMark:
      '## Introduction\nLipids are a diverse group of biomolecules that are insoluble in water and soluble in non-polar solvents (ether, chloroform). They are made mainly of C, H and O, with far less oxygen than carbohydrates.\n\n## Fatty acids\nLong hydrocarbon chains with a –COOH group.\n- **Saturated:** only single C–C bonds (palmitic acid); straight chains pack tightly → solid fats.\n- **Unsaturated:** one (mono) or more (poly) C=C bonds (oleic, linoleic acid); kinks prevent packing → liquid oils.\n- **Essential fatty acids:** omega-3 and omega-6 must come from food.\n\n## Classification\n### 1. Simple lipids\n- **Triglycerides:** glycerol + 3 fatty acids by **ester bonds**.\n- **Waxes:** long-chain fatty acid + long-chain alcohol.\n\n### 2. Compound lipids\n- **Phospholipids:** glycerol + 2 fatty acids + phosphate group; amphipathic (hydrophilic head, hydrophobic tails); form membranes.\n- **Glycolipids:** lipid + carbohydrate; cell recognition.\n\n### 3. Derived lipids\n- **Steroids:** four fused carbon rings — cholesterol, sex hormones, vitamin D.\n\n## Functions\n1. **Energy storage:** 9 kcal/g.\n2. **Membrane structure:** phospholipid bilayer, cholesterol for fluidity.\n3. **Insulation and protection:** adipose tissue.\n4. **Hormones:** steroid hormones.\n5. **Vitamins:** fat-soluble A, D, E, K.\n6. **Waterproofing:** waxes.\n\n## Conclusion\nLipids store energy, build membranes and send signals; their chemistry is also the basis of biodiesel and many cosmetics.',
    realWorld:
      '- **Biodiesel** is made by converting vegetable oils (jatropha, used cooking oil) with methanol.\n- **Lipid nanoparticles** carry mRNA in COVID-19 vaccines.\n- **Lipid profile tests** (cholesterol, triglycerides) screen for heart disease.\n- **Soaps and detergents** work because fatty-acid salts have a water-loving head and an oil-loving tail.',
    flashcards: [
      ['Triglyceride is made of?', '1 glycerol + 3 fatty acids, joined by ester bonds.'],
      ['Saturated vs unsaturated fat?', 'Saturated: no C=C, solid. Unsaturated: has C=C, liquid.'],
      ['Energy from 1 g of fat?', 'About 9 kcal.'],
      [
        'Why are phospholipids amphipathic?',
        'Hydrophilic phosphate head and hydrophobic fatty-acid tails.',
      ],
      ['Example of a steroid?', 'Cholesterol (also testosterone, oestrogen).'],
    ],
    mcqs: [
      mcq(
        'Lipids are…',
        [
          ['Soluble in water', 'They are insoluble in water.'],
          ['Insoluble in water, soluble in organic solvents', 'Correct.'],
          ['Polymers of amino acids', 'That describes proteins.'],
          ['Made of nucleotides', 'That describes nucleic acids.'],
        ],
        1,
        'Lipids are hydrophobic.',
      ),
      mcq(
        'Ghee is solid at room temperature mainly because it is rich in…',
        [
          ['Saturated fatty acids', 'Correct.'],
          ['Unsaturated fatty acids', 'They make oils liquid.'],
          ['Proteins', 'Ghee is mostly fat.'],
          ['Starch', 'Ghee has no starch.'],
        ],
        0,
        'Straight saturated chains pack tightly, so the fat is solid.',
        'medium',
      ),
      mcq(
        'The main lipid of cell membranes is…',
        [
          ['Triglyceride', 'Triglycerides store energy.'],
          ['Phospholipid', 'Correct.'],
          ['Wax', 'Waxes waterproof surfaces.'],
          ['Glycogen', 'Glycogen is a carbohydrate.'],
        ],
        1,
        'Membranes are phospholipid bilayers.',
      ),
      mcq(
        'Which vitamin is fat-soluble?',
        [
          ['Vitamin C', 'Vitamin C is water-soluble.'],
          ['Vitamin B12', 'B vitamins are water-soluble.'],
          ['Vitamin D', 'Correct.'],
          ['Folic acid', 'Folic acid is a B vitamin.'],
        ],
        2,
        'Vitamins A, D, E and K are fat-soluble.',
      ),
      mcq(
        'Glycerol and fatty acids in a triglyceride are linked by…',
        [
          ['Peptide bonds', 'Those link amino acids.'],
          ['Ester bonds', 'Correct.'],
          ['Glycosidic bonds', 'Those link sugars.'],
          ['Hydrogen bonds', 'These are weak, not the main links.'],
        ],
        1,
        'Each –OH of glycerol forms an ester with a fatty acid –COOH.',
        'medium',
      ),
    ],
  },

  nucleicAcids: {
    curiosity:
      'Microsoft researchers stored a music video and books in DNA, and one gram of DNA can hold about 215 petabytes. What makes DNA such a good storage medium?',
    curiosityQuestion: hook(
      'DNA stores information using a code of how many different bases?',
      ['2, like binary', '4: A, T, G, C', '20, like amino acids'],
      1,
      'DNA uses four bases, so each base can carry 2 bits of information.',
    ),
    easy: '**Nucleic acids** store and use genetic information. They are polymers of **nucleotides**.\n\nEach nucleotide = **phosphate + sugar + nitrogen base**.\n\n**DNA (deoxyribonucleic acid)**\n- Sugar: **deoxyribose**.\n- Bases: **A, T, G, C**. Pairing rule: **A–T** (2 hydrogen bonds), **G–C** (3 hydrogen bonds).\n- **Double helix** of two antiparallel strands (Watson and Crick, 1953).\n- Stores genetic information in the nucleus.\n\n**RNA (ribonucleic acid)**\n- Sugar: **ribose**.\n- Bases: **A, U, G, C** — **uracil replaces thymine**.\n- Usually **single-stranded**.\n- Three main types: **mRNA** (message), **tRNA** (brings amino acids), **rRNA** (part of ribosomes).\n\nThe **central dogma**: DNA → (transcription) → RNA → (translation) → Protein.',
    tenMark:
      '## Introduction\nNucleic acids (DNA and RNA) are polymers of nucleotides that store, transmit and express genetic information. They were first isolated by Friedrich Miescher (1869) as “nuclein”.\n\n## Nucleotide structure\n1. **Pentose sugar:** deoxyribose (DNA) or ribose (RNA).\n2. **Nitrogen base:** purines (adenine, guanine — two rings) and pyrimidines (cytosine, thymine, uracil — one ring).\n3. **Phosphate group.**\nNucleotides join by **phosphodiester bonds** between the 3′ carbon of one sugar and the 5′ phosphate of the next, forming a sugar–phosphate backbone.\n\n## DNA structure (Watson–Crick model, 1953)\n- Two polynucleotide strands coiled into a right-handed **double helix**.\n- Strands are **antiparallel** (5′→3′ and 3′→5′).\n- **Complementary base pairing:** A=T (2 H-bonds), G≡C (3 H-bonds).\n- **Chargaff’s rule:** A = T and G = C, so purines = pyrimidines.\n- Diameter 2 nm; one turn = 3.4 nm = 10 base pairs.\n\n## RNA types\n| Type | Function |\n|---|---|\n| mRNA | Carries the code from DNA to ribosomes |\n| tRNA | Brings specific amino acids; has anticodon |\n| rRNA | Forms ribosomes; catalyses peptide bonds |\n\n## DNA vs RNA\n| Feature | DNA | RNA |\n|---|---|---|\n| Sugar | Deoxyribose | Ribose |\n| Bases | A, T, G, C | A, U, G, C |\n| Strands | Double | Usually single |\n| Location | Nucleus (mainly) | Nucleus and cytoplasm |\n| Function | Stores information | Expresses information |\n| Stability | More stable | Less stable |\n\n## Central dogma\nDNA → replication → DNA; DNA → transcription → mRNA; mRNA → translation → protein.\n\n## Conclusion\nDNA is the cell’s long-term storage and RNA its working copy — an architecture strikingly like hard disk and RAM.',
    realWorld:
      '- **DNA data storage:** 1 g of DNA can hold about 215 PB; Microsoft and Twist Bioscience have stored files in DNA.\n- **mRNA vaccines** (Pfizer, Moderna; India’s Gemcovac) deliver RNA instructions to make a viral protein.\n- **DNA fingerprinting** identifies people in forensic and paternity cases.\n- **DNA computing** has solved small graph problems using DNA strands as parallel processors.',
    flashcards: [
      ['Parts of a nucleotide?', 'Phosphate, pentose sugar, nitrogen base.'],
      ['Base pairing in DNA?', 'A–T (2 H-bonds), G–C (3 H-bonds).'],
      ['Base found in RNA but not DNA?', 'Uracil (replaces thymine).'],
      ['Central dogma?', 'DNA → RNA → protein (transcription, then translation).'],
      [
        'Who proposed the double helix?',
        'Watson and Crick, 1953 (using Rosalind Franklin’s X-ray data).',
      ],
    ],
    mcqs: [
      mcq(
        'Which base is absent in DNA?',
        [
          ['Adenine', 'Present in both.'],
          ['Thymine', 'Thymine is in DNA.'],
          ['Uracil', 'Correct.'],
          ['Guanine', 'Present in both.'],
        ],
        2,
        'Uracil replaces thymine in RNA.',
      ),
      mcq(
        'G and C are joined by…',
        [
          ['1 hydrogen bond', 'Too few.'],
          ['2 hydrogen bonds', 'That is A–T.'],
          ['3 hydrogen bonds', 'Correct.'],
          ['A peptide bond', 'Peptide bonds join amino acids.'],
        ],
        2,
        'G≡C has three hydrogen bonds, so GC-rich DNA is more stable.',
        'medium',
      ),
      mcq(
        'If a DNA sample has 30% adenine, its guanine content is…',
        [
          ['30%', 'That is thymine (A = T).'],
          ['20%', 'Correct.'],
          ['40%', 'A + T = 60%, leaving 40% for G + C together.'],
          ['70%', 'Too high.'],
        ],
        1,
        'A = T = 30% → G + C = 40% → G = 20% (Chargaff’s rule).',
        'hard',
      ),
      mcq(
        'Which RNA carries amino acids to the ribosome?',
        [
          ['mRNA', 'mRNA carries the code.'],
          ['tRNA', 'Correct.'],
          ['rRNA', 'rRNA forms the ribosome.'],
          ['DNA', 'DNA stays in the nucleus.'],
        ],
        1,
        'Each tRNA carries a specific amino acid and has an anticodon.',
      ),
      mcq(
        'Making RNA from a DNA template is called…',
        [
          ['Replication', 'Replication makes DNA from DNA.'],
          ['Transcription', 'Correct.'],
          ['Translation', 'Translation makes protein from mRNA.'],
          ['Mutation', 'A mutation is a change in DNA.'],
        ],
        1,
        'Transcription copies a gene into mRNA.',
      ),
    ],
  },

  enzymes: {
    curiosity:
      'Chew a piece of plain rice for a minute and it starts to taste sweet. Nothing sweet was added. What happened in your mouth?',
    curiosityQuestion: hook(
      'Why does rice taste sweet after chewing it for a while?',
      [
        'Salivary amylase breaks starch into sweet maltose',
        'Saliva contains sugar',
        'Teeth release glucose',
      ],
      0,
      'Amylase, an enzyme in saliva, hydrolyses starch into maltose, which tastes sweet.',
    ),
    easy: '**Enzymes** are **biological catalysts**: they speed up reactions without being used up. Almost all are **proteins** (some RNAs, called ribozymes, also act as enzymes).\n\nHow they work:\n\n- The molecule an enzyme acts on is the **substrate**; it fits into the enzyme’s **active site**.\n- They form an **enzyme–substrate complex**, then release the **product**: E + S → ES → E + P.\n- Enzymes **lower the activation energy**, so reactions happen fast at body temperature.\n\nTwo models of fit:\n\n- **Lock and key** (Fischer) — the active site is rigid and matches the substrate exactly.\n- **Induced fit** (Koshland) — the active site changes shape slightly to grip the substrate.\n\nEnzymes are **specific**: amylase acts on starch, not on protein. Names usually end in **-ase** (lipase, protease).',
    tenMark:
      '## Introduction\nEnzymes are biocatalysts, mostly globular proteins, that accelerate biochemical reactions by lowering activation energy, without being consumed. The term was coined by Kühne (1878).\n\n## Properties\n1. Highly **specific** for substrate and reaction.\n2. Effective in very small amounts; turnover numbers up to millions per second.\n3. Unchanged at the end of the reaction.\n4. Sensitive to temperature, pH and inhibitors.\n5. Do not change the equilibrium, only the rate.\n\n## Parts of an enzyme\n- **Apoenzyme:** protein part.\n- **Cofactor:** non-protein part — metal ions (Zn²⁺, Mg²⁺) or organic **coenzymes** (NAD⁺, FAD, from vitamins).\n- **Holoenzyme** = apoenzyme + cofactor (the active form).\n\n## Classification (IUBMB / EC system — six classes)\n| EC | Class | Reaction | Example |\n|---|---|---|---|\n| 1 | Oxidoreductases | Oxidation–reduction | Dehydrogenases, glucose oxidase |\n| 2 | Transferases | Transfer groups | Kinases |\n| 3 | Hydrolases | Break bonds with water | Amylase, lipase, protease |\n| 4 | Lyases | Add/remove groups without water | Decarboxylase |\n| 5 | Isomerases | Rearrange within a molecule | Glucose isomerase |\n| 6 | Ligases | Join molecules using ATP | DNA ligase |\n\n## Mechanism of action\n1. Substrate binds to the **active site** → enzyme–substrate complex (ES).\n2. The enzyme strains bonds, orients reactants or provides a favourable environment, **lowering activation energy**.\n3. Products form and leave; the enzyme is free to act again.\n\n### Lock-and-key model (Emil Fischer, 1894)\nRigid active site complementary to the substrate, like a key in a lock. Explains specificity.\n\n### Induced-fit model (Daniel Koshland, 1958)\nThe active site is flexible; substrate binding induces a better fit. Explains how some enzymes act on similar substrates.\n\n## Conclusion\nBy lowering activation energy with high specificity, enzymes make life’s chemistry fast and controllable — and make industrial processes greener.',
    realWorld:
      '- **Glucose oxidase** (an oxidoreductase) is the heart of every glucometer strip.\n- **DNA ligase and restriction enzymes** are essential tools of genetic engineering.\n- **Protease and lipase** in detergents remove blood and oil stains at low temperatures.\n- **Enzyme kinetics** models are simulated in software to design drugs that block disease enzymes.',
    flashcards: [
      ['What is an enzyme?', 'A biological catalyst, usually a protein, that speeds up reactions.'],
      [
        'Six EC classes?',
        'Oxidoreductases, transferases, hydrolases, lyases, isomerases, ligases.',
      ],
      ['Lock-and-key model?', 'Fischer: a rigid active site that exactly fits the substrate.'],
      ['Induced-fit model?', 'Koshland: the active site changes shape to fit the substrate.'],
      ['Holoenzyme?', 'Apoenzyme (protein) + cofactor = active enzyme.'],
    ],
    mcqs: [
      mcq(
        'Enzymes speed up reactions by…',
        [
          ['Raising temperature', 'They work at body temperature.'],
          ['Lowering activation energy', 'Correct.'],
          ['Changing the equilibrium', 'They do not change the equilibrium.'],
          ['Being consumed', 'They are not used up.'],
        ],
        1,
        'A lower activation energy means more molecules can react.',
      ),
      mcq(
        'Amylase belongs to which class?',
        [
          ['Oxidoreductases', 'They transfer electrons.'],
          ['Hydrolases', 'Correct.'],
          ['Ligases', 'Ligases join molecules.'],
          ['Isomerases', 'Isomerases rearrange molecules.'],
        ],
        1,
        'Amylase breaks starch using water: hydrolysis.',
        'medium',
      ),
      mcq(
        'The induced-fit model was proposed by…',
        [
          ['Emil Fischer', 'Fischer proposed lock and key.'],
          ['Daniel Koshland', 'Correct.'],
          ['Louis Pasteur', 'Pasteur studied fermentation.'],
          ['Gregor Mendel', 'Mendel studied heredity.'],
        ],
        1,
        'Koshland proposed it in 1958.',
      ),
      mcq(
        'The non-protein part of an enzyme is called the…',
        [
          ['Apoenzyme', 'That is the protein part.'],
          ['Cofactor', 'Correct.'],
          ['Substrate', 'The substrate is acted upon.'],
          ['Product', 'The product is the result.'],
        ],
        1,
        'Cofactors may be metal ions or organic coenzymes.',
      ),
      mcq(
        'DNA ligase is an example of…',
        [
          ['Hydrolase', 'Hydrolases break bonds.'],
          ['Ligase', 'Correct.'],
          ['Lyase', 'Lyases break bonds without water.'],
          ['Transferase', 'Transferases move groups.'],
        ],
        1,
        'DNA ligase joins DNA fragments using ATP: EC class 6.',
        'medium',
      ),
    ],
  },

  enzymeFactors: {
    curiosity:
      'A high fever above 42 °C can be fatal, even though your body is only a few degrees warmer than normal. Why is a small temperature rise so dangerous?',
    curiosityQuestion: hook(
      'Why can a very high fever be life-threatening?',
      ['Enzymes start to denature and stop working', 'Blood starts to boil', 'Bones begin to melt'],
      0,
      'Above the optimum temperature, enzymes lose their shape, so vital reactions slow down.',
    ),
    easy: 'An enzyme’s speed (rate) depends on:\n\n1. **Temperature** — the rate rises up to the **optimum** (about **37 °C** for human enzymes), then falls sharply as the enzyme **denatures**. At low temperature enzymes are slow but not destroyed.\n2. **pH** — each enzyme has an **optimum pH**: pepsin (stomach) ≈ **2**, salivary amylase ≈ **7**, trypsin (intestine) ≈ **8**.\n3. **Substrate concentration** — the rate rises, then levels off at **Vmax** when all active sites are busy (saturation).\n4. **Enzyme concentration** — more enzyme gives a faster rate if substrate is plentiful.\n5. **Inhibitors** — slow enzymes down:\n   - **Competitive** — look like the substrate and block the active site.\n   - **Non-competitive** — bind elsewhere and change the enzyme’s shape.\n6. **Activators/cofactors** — metal ions such as Mg²⁺ can increase activity.',
    tenMark:
      '## Introduction\nThe rate of an enzyme-catalysed reaction is affected by physical and chemical factors that alter the enzyme’s shape or the collisions between enzyme and substrate.\n\n## 1. Temperature\n- Rate increases with temperature (more collisions), roughly doubling for every 10 °C rise.\n- **Optimum temperature:** about 37 °C for human enzymes; 70–80 °C for Taq polymerase from hot-spring bacteria.\n- Above optimum, H-bonds break, the active site changes shape → **denaturation** → rate falls.\n- At low temperature, enzymes are inactive but not denatured (basis of refrigeration).\n\n## 2. pH\n- Changes the charge on amino acids in the active site.\n- Each enzyme has an **optimum pH**: pepsin 1.5–2, amylase 6.8–7, trypsin 7.5–8.5.\n- Extreme pH denatures the enzyme.\n\n## 3. Substrate concentration\n- Rate increases as substrate rises, until all active sites are occupied → **Vmax**.\n- **Michaelis–Menten:** v = Vmax[S] / (Km + [S]).\n- **Km** = substrate concentration at half Vmax; a low Km means high affinity.\n\n## 4. Enzyme concentration\nWith excess substrate, rate is directly proportional to enzyme concentration.\n\n## 5. Inhibitors\n| Type | Binds to | Effect | Example |\n|---|---|---|---|\n| Competitive | Active site | Km ↑, Vmax same; overcome by more substrate | Malonate on succinate dehydrogenase |\n| Non-competitive | Allosteric site | Vmax ↓, Km same | Heavy metals (Hg²⁺, Pb²⁺) |\n| Irreversible | Covalently | Permanent loss | Nerve gases, penicillin on bacterial enzyme |\n\n## 6. Activators and cofactors\nMetal ions (Mg²⁺, Zn²⁺) and coenzymes can increase activity.\n\n## 7. Products\nProduct build-up can slow the reaction (feedback inhibition).\n\n## Conclusion\nIndustrial processes and medicines are designed around these factors: bioreactors hold the optimum, and many drugs are deliberately enzyme inhibitors.',
    realWorld:
      '- **Refrigeration** slows enzymes in food, so it spoils more slowly.\n- **Bioreactor control systems** hold temperature and pH at the enzyme optimum.\n- **Many drugs are inhibitors:** aspirin blocks COX enzymes; statins block cholesterol synthesis.\n- **Thermostable Taq polymerase** survives the 95 °C steps of PCR.',
    flashcards: [
      ['Optimum temperature of human enzymes?', 'About 37 °C.'],
      ['Optimum pH of pepsin?', 'About 2 (acidic stomach).'],
      ['What is Vmax?', 'The maximum rate, when all active sites are saturated with substrate.'],
      [
        'Competitive inhibitor?',
        'Resembles the substrate and binds the active site; overcome by more substrate.',
      ],
      ['Km?', 'Substrate concentration at half Vmax; low Km = high affinity.'],
    ],
    mcqs: [
      mcq(
        'Above the optimum temperature, enzyme activity falls because the enzyme…',
        [
          ['Multiplies', 'Enzymes do not multiply.'],
          ['Denatures', 'Correct.'],
          ['Turns into substrate', 'It does not.'],
          ['Gains energy', 'Not the reason for the fall.'],
        ],
        1,
        'Heat breaks bonds that hold the active-site shape.',
      ),
      mcq(
        'Pepsin works best at pH…',
        [
          ['2', 'Correct.'],
          ['7', 'That suits salivary amylase.'],
          ['8', 'That suits trypsin.'],
          ['11', 'Too alkaline.'],
        ],
        0,
        'The stomach is strongly acidic.',
      ),
      mcq(
        'A competitive inhibitor binds to…',
        [
          ['The active site', 'Correct.'],
          ['An allosteric site', 'That is non-competitive.'],
          ['The product', 'Inhibitors bind enzymes.'],
          ['DNA', 'Unrelated.'],
        ],
        0,
        'It competes with the substrate for the active site.',
        'medium',
      ),
      mcq(
        'At very high substrate concentration, the rate…',
        [
          ['Keeps rising forever', 'Active sites become saturated.'],
          ['Levels off at Vmax', 'Correct.'],
          ['Drops to zero', 'It does not.'],
          ['Becomes negative', 'Rates cannot be negative.'],
        ],
        1,
        'All active sites are occupied, so the rate reaches its maximum.',
      ),
      mcq(
        'Heavy metals such as mercury act as…',
        [
          ['Coenzymes', 'They are not helpers.'],
          ['Non-competitive inhibitors', 'Correct.'],
          ['Substrates', 'They are not converted.'],
          ['Activators', 'They reduce activity.'],
        ],
        1,
        'They bind elsewhere on the enzyme and distort its shape.',
        'hard',
      ),
    ],
  },

  enzymeApps: {
    curiosity:
      'Modern washing powders say “works in cold water” and remove blood and curry stains that soap alone cannot. What is the secret ingredient?',
    curiosityQuestion: hook(
      'What lets “biological” detergents remove protein and fat stains in cold water?',
      ['Enzymes such as protease and lipase', 'Extra bleach', 'Sand particles'],
      0,
      'Proteases digest protein stains (blood, egg) and lipases digest fats and oils.',
    ),
    easy: 'Because enzymes are fast, specific and work in mild conditions, they replace harsh chemicals in many industries.\n\n**Industrial uses**\n- **Detergents:** protease (protein stains), lipase (oil), amylase (starch).\n- **Food:** amylase (bread, syrups), **rennin/chymosin** (cheese), pectinase (clear fruit juice), lactase (lactose-free milk).\n- **Textiles and paper:** cellulase (stone-washed jeans), amylase (desizing), xylanase (paper bleaching).\n- **Biofuels:** amylase and cellulase turn starch and plant waste into sugar for ethanol.\n\n**Biomedical uses**\n- **Diagnosis:** glucose oxidase in glucometers; blood enzyme levels (SGPT/ALT for liver, troponin and CK-MB for heart).\n- **Therapy:** streptokinase dissolves blood clots after a heart attack; asparaginase treats leukaemia.\n- **Research:** restriction enzymes, DNA polymerase and ligase in genetic engineering.',
    tenMark:
      '## Introduction\nEnzymes are used industrially because they are specific, efficient, work at mild temperature and pH, and are biodegradable. Most are produced by microbial fermentation (Bacillus, Aspergillus). They can be **immobilised** on a support for reuse.\n\n## Industrial applications\n| Industry | Enzyme | Use |\n|---|---|---|\n| Detergent | Protease, lipase, amylase | Remove protein, fat, starch stains |\n| Dairy | Rennin (chymosin), lactase | Cheese making; lactose-free milk |\n| Baking / starch | α-amylase, glucoamylase | Bread, glucose syrup |\n| Sweeteners | Glucose isomerase | High-fructose syrup |\n| Fruit juice | Pectinase | Clarify juice, increase yield |\n| Textile | Cellulase, amylase | Bio-polishing, stone-wash denim, desizing |\n| Leather | Protease | Dehairing hides (less sulphide pollution) |\n| Paper | Xylanase | Bio-bleaching pulp |\n| Biofuel | Cellulase, amylase | Convert biomass to fermentable sugar |\n\n## Biomedical applications\n### Diagnostic\n- **Glucose oxidase + peroxidase:** blood and urine glucose.\n- **Serum enzymes as markers:** ALT/AST (liver), CK-MB (heart attack), amylase (pancreatitis), alkaline phosphatase (bone/liver).\n- **ELISA:** enzyme-linked antibodies detect HIV, dengue.\n\n### Therapeutic\n- **Streptokinase / tPA:** dissolve blood clots.\n- **L-asparaginase:** acute lymphoblastic leukaemia.\n- **Digestive enzymes:** pancreatin for pancreatic insufficiency.\n- **Lysozyme:** antibacterial.\n\n### Research and biotechnology\nRestriction enzymes, DNA ligase, Taq polymerase, reverse transcriptase.\n\n## Immobilised enzymes\nEnzymes fixed on beads or membranes can be reused, separated easily from product and run in continuous reactors.\n\n## Conclusion\nEnzymes make industry cleaner and medicine more precise; enzyme technology is a core part of green engineering.',
    realWorld:
      '- **Indian biotech firms** such as Biocon began by producing industrial enzymes before moving to medicines.\n- **Lactose-free milk** is made with lactase.\n- **Glucometers** sold in every pharmacy rely on glucose oxidase.\n- **2G ethanol plants** (e.g. Panipat) use cellulase to convert rice straw into fuel instead of burning it.',
    flashcards: [
      ['Enzymes in detergents?', 'Protease, lipase and amylase.'],
      ['Enzyme used in cheese making?', 'Rennin (chymosin).'],
      ['Enzyme that dissolves blood clots?', 'Streptokinase (also tPA).'],
      ['Enzyme in glucometer strips?', 'Glucose oxidase.'],
      [
        'Advantage of immobilised enzymes?',
        'Reusable, easy to separate from product, suit continuous processes.',
      ],
    ],
    mcqs: [
      mcq(
        'Pectinase is used to…',
        [
          ['Make cheese', 'Rennin is used for cheese.'],
          ['Clarify fruit juice', 'Correct.'],
          ['Dissolve clots', 'Streptokinase does that.'],
          ['Measure glucose', 'Glucose oxidase does that.'],
        ],
        1,
        'Pectinase breaks pectin that makes juice cloudy.',
      ),
      mcq(
        'Streptokinase is used to…',
        [
          ['Dissolve blood clots', 'Correct.'],
          ['Digest starch', 'Amylase does that.'],
          ['Join DNA', 'Ligase does that.'],
          ['Make bread rise', 'Yeast does that.'],
        ],
        0,
        'It is given after a heart attack to break down fibrin clots.',
      ),
      mcq(
        'Raised CK-MB in blood suggests…',
        [
          ['Liver damage', 'ALT/AST point to liver damage.'],
          ['Heart muscle damage', 'Correct.'],
          ['Diabetes', 'Glucose tests diagnose diabetes.'],
          ['Bone fracture', 'Not a marker for fracture.'],
        ],
        1,
        'CK-MB is released by damaged heart muscle.',
        'medium',
      ),
      mcq(
        'Cellulase is used in the textile industry for…',
        [
          ['Stone-washed denim and bio-polishing', 'Correct.'],
          ['Dyeing', 'Not the enzyme’s role.'],
          ['Weaving', 'A mechanical process.'],
          ['Making nylon', 'Nylon is synthetic.'],
        ],
        0,
        'Cellulase softens and fades cotton without pumice stones.',
        'medium',
      ),
      mcq(
        'A key advantage of immobilised enzymes is…',
        [
          ['They become proteins', 'They already are.'],
          ['They can be reused', 'Correct.'],
          ['They work only once', 'The opposite.'],
          ['They need no substrate', 'All enzymes need substrate.'],
        ],
        1,
        'Fixed enzymes are recovered and reused, cutting cost.',
      ),
    ],
  },
};
