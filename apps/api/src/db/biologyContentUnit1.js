/**
 * Biology for Computer Engineers (BOT26105), Unit I: Cell Biology. Faculty-authored demo content,
 * seeded as published. No videos yet: faculty add them in the studio.
 */
import { hook, mcq } from './biologyContentHelpers.js';

export const BIOLOGY_UNIT1 = {
  cellIntro: {
    curiosity:
      'A smartphone is built from billions of transistors, each one switching on and off. Your body is built from about 37 trillion tiny units, each one alive on its own. What is that unit, and why does an engineer need to understand it?',
    curiosityQuestion: hook(
      'What is the smallest unit that can carry out all the processes of life on its own?',
      ['An atom', 'A cell', 'An organ'],
      1,
      'A cell takes in energy, grows, responds and reproduces by itself. Atoms are not alive, and organs are made of many cells.',
    ),
    easy: '**Biology** is the study of living things, from bacteria to blue whales.\n\nEvery living thing shares some **characteristics of life**: it is made of cells, uses energy (metabolism), grows, responds to its surroundings, reproduces and keeps its inside stable (**homeostasis**).\n\nThe **cell** is the basic unit of life, just as a transistor is the basic unit of a chip:\n\n- Some organisms are a **single cell** (bacteria, yeast, amoeba).\n- Others are **multicellular**: cells → tissues → organs → organ systems → organism.\n\nThe **cell theory** (Schleiden, Schwann and Virchow) says: all living things are made of cells, the cell is the basic unit of structure and function, and every cell comes from an existing cell.',
    tenMark:
      '## Introduction\nBiology (Greek *bios* = life, *logos* = study) is the science of living organisms: their structure, function, growth, origin and interaction with the environment. For engineers it is the foundation of biotechnology, biomedical engineering, bioinformatics and environmental engineering.\n\n## Characteristics of living organisms\n1. **Cellular organisation:** made of one or more cells.\n2. **Metabolism:** chemical reactions that release and use energy.\n3. **Growth and development:** increase in size and complexity.\n4. **Response to stimuli:** reacting to light, heat, touch and chemicals.\n5. **Reproduction:** producing offspring.\n6. **Homeostasis:** keeping internal conditions stable.\n7. **Adaptation and evolution:** changing over generations to suit the environment.\n\n## The cell as the basic unit of life\n- **Discovery:** Robert Hooke (1665) saw “cells” in cork; Antonie van Leeuwenhoek saw living cells.\n- **Cell theory:**\n  1. All living organisms are made of one or more cells (Schleiden 1838, Schwann 1839).\n  2. The cell is the basic structural and functional unit of life.\n  3. All cells arise from pre-existing cells — *omnis cellula e cellula* (Virchow, 1855).\n\n## Levels of organisation\n| Level | Example |\n|---|---|\n| Cell | Neuron |\n| Tissue | Nervous tissue |\n| Organ | Brain |\n| Organ system | Nervous system |\n| Organism | Human |\n\n## Size of cells\nMost cells are 1–100 µm; bacteria are 1–5 µm, human cells 10–30 µm. A small size keeps the surface-area-to-volume ratio high, so materials diffuse in and out quickly.\n\n## Conclusion\nThe cell is to biology what the transistor is to electronics: understanding it is the first step to engineering with living systems.',
    realWorld:
      '- **Neural networks** in AI were inspired by how nerve cells (neurons) pass signals.\n- **Cell counters** in hospital labs use image processing and lasers to count blood cells.\n- **Computer vision** models classify cells in microscope images to detect cancer.\n- **Bio-inspired design:** self-healing materials copy how cells repair damage.',
    flashcards: [
      ['Basic unit of life?', 'The cell.'],
      [
        'Three points of the cell theory?',
        'All living things are made of cells; the cell is the basic unit of structure and function; all cells come from pre-existing cells.',
      ],
      ['Who first saw and named cells?', 'Robert Hooke, in cork, in 1665.'],
      ['What is homeostasis?', 'Keeping the internal conditions of an organism stable.'],
      ['Levels of organisation?', 'Cell → tissue → organ → organ system → organism.'],
    ],
    mcqs: [
      mcq(
        'The basic structural and functional unit of life is the…',
        [
          ['Atom', 'Atoms are not alive.'],
          ['Cell', 'Correct.'],
          ['Tissue', 'A tissue is a group of cells.'],
          ['Organ', 'An organ is made of tissues.'],
        ],
        1,
        'The cell is the smallest unit that shows all the characteristics of life.',
      ),
      mcq(
        '“All cells arise from pre-existing cells” was stated by…',
        [
          ['Robert Hooke', 'Hooke named cells.'],
          ['Rudolf Virchow', 'Correct.'],
          ['Gregor Mendel', 'Mendel studied inheritance.'],
          ['Charles Darwin', 'Darwin proposed natural selection.'],
        ],
        1,
        'Virchow added the third point of the cell theory in 1855: omnis cellula e cellula.',
        'medium',
      ),
      mcq(
        'Keeping body temperature near 37 °C is an example of…',
        [
          ['Reproduction', 'Reproduction makes offspring.'],
          ['Homeostasis', 'Correct.'],
          ['Evolution', 'Evolution happens over generations.'],
          ['Growth', 'Growth is an increase in size.'],
        ],
        1,
        'Homeostasis keeps internal conditions stable despite outside changes.',
      ),
      mcq(
        'Which is the correct order of organisation?',
        [
          ['Organ → tissue → cell', 'This is reversed.'],
          ['Cell → tissue → organ → organ system', 'Correct.'],
          ['Tissue → cell → organ', 'Cells form tissues, not the other way.'],
          ['Cell → organ → tissue', 'Tissues come before organs.'],
        ],
        1,
        'Cells group into tissues, tissues into organs, organs into systems.',
      ),
      mcq(
        'Cells are small mainly because…',
        [
          ['Small cells use no energy', 'All cells use energy.'],
          [
            'A high surface-area-to-volume ratio lets materials diffuse in and out quickly',
            'Correct.',
          ],
          ['Large cells cannot have DNA', 'Size does not prevent DNA.'],
          ['Microscopes cannot see large cells', 'Visibility does not limit cell size.'],
        ],
        1,
        'As a cell grows, volume rises faster than surface area, so exchange becomes too slow.',
        'medium',
      ),
    ],
  },

  cellTypes: {
    curiosity:
      'Antibiotics kill the bacteria making you ill, but do not harm your own cells. How can a medicine tell the two kinds of cells apart?',
    curiosityQuestion: hook(
      'Why can antibiotics target bacteria without harming human cells?',
      [
        'Bacteria are prokaryotes with different structures, such as a cell wall and 70S ribosomes',
        'Bacteria have no DNA',
        'Human cells are too big for antibiotics to enter',
      ],
      0,
      'Antibiotics such as penicillin attack the bacterial cell wall, and others attack 70S ribosomes; human cells have neither.',
    ),
    easy: 'There are two basic kinds of cells:\n\n- **Prokaryotic cells** (*pro* = before, *karyon* = nucleus) have **no true nucleus**. Their DNA floats in a region called the **nucleoid**. They are small (1–10 µm) and simple. Example: **bacteria**.\n- **Eukaryotic cells** (*eu* = true) have a **true nucleus** wrapped in a membrane and **membrane-bound organelles** such as mitochondria. They are larger (10–100 µm). Examples: **plants, animals, fungi, protists**.\n\nThink of a prokaryote as a one-room studio and a eukaryote as a house with separate rooms for separate jobs.\n\nPlant cells also have a **cell wall**, **chloroplasts** and a large **vacuole**; animal cells do not.',
    tenMark:
      '## Introduction\nAll cells are classified as prokaryotic or eukaryotic based on whether they have a membrane-bound nucleus.\n\n## Prokaryotic cells\n- No nuclear membrane; DNA is a single circular chromosome in the **nucleoid**.\n- Extra small circular DNA called **plasmids** may be present.\n- No membrane-bound organelles (no mitochondria, ER or Golgi).\n- **70S ribosomes**.\n- Cell wall made of **peptidoglycan** (in bacteria).\n- May have flagella, pili and a capsule.\n- Divide by **binary fission**.\n- Examples: bacteria (E. coli), cyanobacteria, archaea.\n\n## Eukaryotic cells\n- True nucleus with a double nuclear membrane.\n- Several linear chromosomes with histone proteins.\n- Membrane-bound organelles: mitochondria, ER, Golgi, lysosomes, chloroplasts (plants).\n- **80S ribosomes** in the cytoplasm.\n- Divide by **mitosis and meiosis**.\n- Examples: plants, animals, fungi, protists.\n\n## Comparison\n| Feature | Prokaryotic | Eukaryotic |\n|---|---|---|\n| Nucleus | Absent (nucleoid) | Present |\n| Size | 1–10 µm | 10–100 µm |\n| DNA | Circular, no histones | Linear, with histones |\n| Organelles | No membrane-bound organelles | Present |\n| Ribosomes | 70S | 80S |\n| Division | Binary fission | Mitosis / meiosis |\n\n## Plant vs animal cells\nPlant cells have a cellulose cell wall, chloroplasts and a large central vacuole; animal cells have centrioles and small vacuoles and no cell wall.\n\n## Conclusion\nThe differences between prokaryotes and eukaryotes are used in medicine (antibiotics) and biotechnology (bacteria as simple, fast-growing factories).',
    realWorld:
      '- **Antibiotics** target bacterial cell walls and 70S ribosomes, sparing human cells.\n- **E. coli** (a prokaryote) is used to manufacture human insulin because it grows fast.\n- **Yeast** (a eukaryote) is used when a protein needs eukaryotic processing, e.g. some vaccines.\n- **Plasmids** in bacteria are the main tool for carrying genes in genetic engineering.',
    flashcards: [
      ['Prokaryote vs eukaryote in one line?', 'Prokaryotes have no true nucleus; eukaryotes do.'],
      ['Where is DNA in a prokaryote?', 'In the nucleoid region of the cytoplasm.'],
      ['Ribosome type: prokaryote vs eukaryote?', '70S in prokaryotes, 80S in eukaryotes.'],
      ['What are plasmids?', 'Small circular extra DNA in bacteria, used as gene vectors.'],
      [
        'Three structures plant cells have but animal cells lack?',
        'Cell wall, chloroplasts, large central vacuole.',
      ],
    ],
    mcqs: [
      mcq(
        'Which of these is a prokaryote?',
        [
          ['Yeast', 'Yeast is a fungus, a eukaryote.'],
          ['E. coli', 'Correct.'],
          ['Amoeba', 'Amoeba is a protist, a eukaryote.'],
          ['Human liver cell', 'Human cells are eukaryotic.'],
        ],
        1,
        'Bacteria such as E. coli are prokaryotes.',
      ),
      mcq(
        'Prokaryotic cells lack…',
        [
          ['DNA', 'They have DNA in the nucleoid.'],
          ['Ribosomes', 'They have 70S ribosomes.'],
          ['A membrane-bound nucleus', 'Correct.'],
          ['A cell membrane', 'Every cell has a cell membrane.'],
        ],
        2,
        'Prokaryotes have no nuclear membrane and no membrane-bound organelles.',
      ),
      mcq(
        'Ribosomes of eukaryotic cytoplasm are…',
        [
          ['70S', '70S ribosomes are found in prokaryotes.'],
          ['80S', 'Correct.'],
          ['50S', '50S is a subunit of the 70S ribosome.'],
          ['30S', '30S is a subunit of the 70S ribosome.'],
        ],
        1,
        'Eukaryotic cytoplasmic ribosomes are 80S (60S + 40S).',
        'medium',
      ),
      mcq(
        'Which structure is found in plant cells but not in animal cells?',
        [
          ['Mitochondria', 'Both have mitochondria.'],
          ['Nucleus', 'Both have a nucleus.'],
          ['Chloroplast', 'Correct.'],
          ['Cell membrane', 'Both have a cell membrane.'],
        ],
        2,
        'Chloroplasts carry out photosynthesis in plants.',
      ),
      mcq(
        'Prokaryotes reproduce mainly by…',
        [
          ['Mitosis', 'Mitosis is eukaryotic division.'],
          ['Meiosis', 'Meiosis forms gametes in eukaryotes.'],
          ['Binary fission', 'Correct.'],
          ['Budding only', 'Budding is typical of yeast.'],
        ],
        2,
        'A bacterium copies its circular DNA and splits into two.',
      ),
    ],
  },

  membrane: {
    curiosity:
      'A firewall lets safe traffic into a network and blocks the rest. Every one of your cells has its own firewall that decides what gets in. What is it made of?',
    curiosityQuestion: hook(
      'Why does the cell membrane let oxygen through easily but block glucose unless a protein helps?',
      [
        'Oxygen is small and non-polar, so it slips through the lipid layer; glucose is large and polar',
        'Glucose is heavier than the whole membrane',
        'The membrane has holes only the size of oxygen',
      ],
      0,
      'The oily core of the lipid bilayer lets small non-polar molecules pass; polar molecules need channel or carrier proteins.',
    ),
    easy: 'The **cell membrane** (plasma membrane) is the thin boundary around every cell.\n\nIt is a **phospholipid bilayer**: two layers of phospholipids with their water-loving (**hydrophilic**) heads facing out and water-fearing (**hydrophobic**) tails facing in.\n\nProteins float in it like boats on a sea: this picture is the **fluid mosaic model** (Singer and Nicolson, 1972).\n\nThe membrane is **selectively permeable**, like a firewall:\n\n- **Passive transport** needs no energy: diffusion, osmosis (water), facilitated diffusion (through proteins).\n- **Active transport** uses energy (ATP) to move substances against their concentration gradient, e.g. the sodium–potassium pump.',
    tenMark:
      '## Introduction\nThe plasma membrane is a thin (about 7.5 nm), selectively permeable boundary that separates the cell from its environment and controls exchange.\n\n## Fluid mosaic model (Singer and Nicolson, 1972)\n- **Phospholipid bilayer:** hydrophilic phosphate heads face water on both sides; hydrophobic fatty-acid tails face each other inside.\n- **Proteins:** *integral* proteins span the bilayer (channels, carriers); *peripheral* proteins sit on the surface (enzymes, signalling).\n- **Cholesterol:** sits between phospholipids and controls fluidity.\n- **Carbohydrates:** attached to lipids and proteins (glycolipids, glycoproteins) as identity markers on the outer surface.\n- “Fluid” because lipids and proteins move sideways; “mosaic” because proteins are scattered like tiles.\n\n## Functions\n1. Boundary and protection.\n2. Selective permeability.\n3. Cell recognition (glycoproteins, e.g. blood groups).\n4. Receiving signals through receptors (hormones).\n5. Cell adhesion and communication.\n\n## Transport across the membrane\n| Type | Energy | Example |\n|---|---|---|\n| Simple diffusion | No | O₂, CO₂ |\n| Osmosis | No | Water through aquaporins |\n| Facilitated diffusion | No | Glucose through carrier proteins |\n| Active transport | ATP | Na⁺/K⁺ pump (3 Na⁺ out, 2 K⁺ in) |\n| Endocytosis / exocytosis | ATP | Taking in particles / secreting hormones |\n\n## Conclusion\nThe membrane’s selective permeability makes it the model for engineered filters, drug-delivery liposomes and biosensors.',
    realWorld:
      '- **Liposomes** — tiny artificial membranes — carry drugs and mRNA vaccines into cells.\n- **Reverse-osmosis** water purifiers copy the idea of a selectively permeable membrane.\n- **Dialysis machines** use semi-permeable membranes to clean blood.\n- **Nanopore DNA sequencers** read DNA as it passes through a protein pore set in a membrane.',
    flashcards: [
      ['Model of membrane structure?', 'Fluid mosaic model (Singer and Nicolson, 1972).'],
      [
        'Phospholipid head vs tail?',
        'Head is hydrophilic (faces water); tails are hydrophobic (face inward).',
      ],
      ['Role of cholesterol in the membrane?', 'Regulates membrane fluidity.'],
      [
        'Osmosis?',
        'Movement of water across a semi-permeable membrane from dilute to concentrated.',
      ],
      ['Active transport?', 'Movement against a concentration gradient using ATP.'],
    ],
    mcqs: [
      mcq(
        'The fluid mosaic model was proposed by…',
        [
          ['Watson and Crick', 'They described DNA.'],
          ['Singer and Nicolson', 'Correct.'],
          ['Schleiden and Schwann', 'They proposed the cell theory.'],
          ['Hooke', 'Hooke named cells.'],
        ],
        1,
        'Singer and Nicolson proposed the model in 1972.',
      ),
      mcq(
        'The hydrophobic part of a phospholipid is the…',
        [
          ['Phosphate head', 'The head is hydrophilic.'],
          ['Fatty-acid tails', 'Correct.'],
          ['Glycerol', 'Glycerol links head and tails.'],
          ['Carbohydrate chain', 'Carbohydrates are hydrophilic.'],
        ],
        1,
        'The non-polar fatty-acid tails avoid water and face the inside of the bilayer.',
      ),
      mcq(
        'Which process needs ATP?',
        [
          ['Simple diffusion', 'Diffusion is passive.'],
          ['Osmosis', 'Osmosis is passive.'],
          ['Sodium–potassium pump', 'Correct.'],
          ['Facilitated diffusion', 'It uses proteins but no energy.'],
        ],
        2,
        'The pump moves ions against their gradients, which costs ATP.',
        'medium',
      ),
      mcq(
        'Movement of water through a semi-permeable membrane is called…',
        [
          ['Diffusion', 'Diffusion refers to solutes in general.'],
          ['Osmosis', 'Correct.'],
          ['Endocytosis', 'Endocytosis engulfs particles.'],
          ['Exocytosis', 'Exocytosis releases material.'],
        ],
        1,
        'Osmosis is the diffusion of water across a selectively permeable membrane.',
      ),
      mcq(
        'Glycoproteins on the membrane surface mainly help in…',
        [
          ['Energy production', 'That is the role of mitochondria.'],
          ['Cell recognition', 'Correct.'],
          ['Protein synthesis', 'That happens at ribosomes.'],
          ['DNA replication', 'That happens in the nucleus.'],
        ],
        1,
        'Glycoproteins act as identity tags, e.g. the ABO blood group antigens.',
        'medium',
      ),
    ],
  },

  organelles: {
    curiosity:
      'A computer has a hard disk that stores the program, a power supply that delivers energy, and a CPU that runs the work. A cell has parts with the same jobs. Which part is the cell’s power supply?',
    curiosityQuestion: hook(
      'Which organelle is called the “powerhouse of the cell”?',
      ['Nucleus', 'Mitochondrion', 'Chloroplast'],
      1,
      'Mitochondria carry out aerobic respiration and make most of the cell’s ATP.',
    ),
    easy: 'Eukaryotic cells divide their work among **organelles**:\n\n- **Nucleus** — the *control centre*. It stores DNA (like a hard disk storing the program) inside a double **nuclear envelope** with **nuclear pores**. The **nucleolus** inside makes ribosomes.\n- **Mitochondrion** — the *powerhouse*. Double membrane; the inner one is folded into **cristae**. It burns glucose with oxygen (aerobic respiration) to make **ATP**, the cell’s energy currency.\n- **Chloroplast** — the *solar panel* of plant cells. Its stacked **thylakoids** (grana) hold chlorophyll, which captures light to make glucose by **photosynthesis**.\n\nMitochondria and chloroplasts have their **own DNA and 70S ribosomes**, which suggests they were once free-living bacteria (**endosymbiotic theory**).',
    tenMark:
      '## Introduction\nOrganelles are membrane-bound compartments that perform specialised functions in eukaryotic cells. Three of the most important are the nucleus, mitochondria and chloroplasts.\n\n## Nucleus\n- **Structure:** double-membrane nuclear envelope with nuclear pores; nucleoplasm; chromatin (DNA + histones); one or more nucleoli.\n- **Functions:**\n  1. Stores genetic information (DNA).\n  2. Controls cell activities by controlling which genes are expressed.\n  3. DNA replication and transcription (making mRNA).\n  4. Nucleolus makes ribosomal RNA and assembles ribosome subunits.\n\n## Mitochondria\n- **Structure:** outer membrane; inner membrane folded into **cristae** (more surface area); fluid **matrix** with enzymes, circular DNA and 70S ribosomes.\n- **Functions:**\n  1. Aerobic respiration: Krebs cycle in the matrix, electron transport chain on the cristae.\n  2. Produces ATP: C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy (about 30–32 ATP).\n  3. Heat production and calcium storage.\n- Muscle and nerve cells have many mitochondria because they need much energy.\n\n## Chloroplast\n- **Structure:** double membrane; **stroma** (fluid); **thylakoids** stacked into **grana**; chlorophyll in the thylakoid membranes; own DNA and ribosomes.\n- **Functions:** photosynthesis: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.\n  - Light reactions (thylakoids) make ATP and NADPH and release O₂.\n  - Calvin cycle (stroma) fixes CO₂ into sugar.\n\n## Comparison\n| | Mitochondrion | Chloroplast |\n|---|---|---|\n| Found in | Plants and animals | Plants and algae |\n| Function | Releases energy | Captures light energy |\n| Inner folds | Cristae | Thylakoids |\n| Own DNA | Yes | Yes |\n\n## Endosymbiotic theory\nMitochondria and chloroplasts have their own circular DNA, 70S ribosomes and double membranes, supporting the idea that they descended from bacteria engulfed by early eukaryotic cells.\n\n## Conclusion\nThe nucleus controls, mitochondria power and chloroplasts harvest light: together they show how specialised compartments make the cell efficient.',
    realWorld:
      '- **Artificial photosynthesis** and organic solar cells try to copy the chloroplast’s light harvesting.\n- **Mitochondrial DNA** tests trace maternal ancestry and identify remains in forensics.\n- **Mitochondrial diseases** cause muscle weakness; diagnosis uses gene sequencing.\n- **Microfluidic chips** are designed as compartments, much like organelles separate cell tasks.',
    flashcards: [
      ['Control centre of the cell?', 'The nucleus.'],
      ['Powerhouse of the cell?', 'The mitochondrion; it makes ATP by aerobic respiration.'],
      [
        'What are cristae?',
        'Folds of the inner mitochondrial membrane that increase surface area.',
      ],
      [
        'Where does photosynthesis happen?',
        'In chloroplasts: light reactions in thylakoids, Calvin cycle in stroma.',
      ],
      [
        'Evidence for the endosymbiotic theory?',
        'Mitochondria and chloroplasts have their own circular DNA, 70S ribosomes and double membranes.',
      ],
    ],
    mcqs: [
      mcq(
        'Ribosomal RNA is made in the…',
        [
          ['Mitochondria', 'Mitochondria make ATP.'],
          ['Nucleolus', 'Correct.'],
          ['Chloroplast', 'Chloroplasts do photosynthesis.'],
          ['Cell membrane', 'The membrane controls transport.'],
        ],
        1,
        'The nucleolus makes rRNA and assembles ribosome subunits.',
        'medium',
      ),
      mcq(
        'The folds of the inner mitochondrial membrane are called…',
        [
          ['Grana', 'Grana are thylakoid stacks in chloroplasts.'],
          ['Cristae', 'Correct.'],
          ['Stroma', 'Stroma is the chloroplast fluid.'],
          ['Cisternae', 'Cisternae are Golgi or ER sacs.'],
        ],
        1,
        'Cristae give a large surface for the electron transport chain.',
      ),
      mcq(
        'Chlorophyll is located in the…',
        [
          ['Stroma', 'The stroma holds Calvin-cycle enzymes.'],
          ['Thylakoid membranes', 'Correct.'],
          ['Matrix', 'The matrix is in mitochondria.'],
          ['Nucleus', 'The nucleus holds DNA.'],
        ],
        1,
        'Light-absorbing chlorophyll sits in the thylakoid membranes.',
      ),
      mcq(
        'Which cells would have the most mitochondria?',
        [
          ['Skin cells', 'They need relatively little energy.'],
          ['Heart muscle cells', 'Correct.'],
          ['Red blood cells', 'Mature human RBCs have no mitochondria.'],
          ['Fat cells', 'Fat cells store energy but use little.'],
        ],
        1,
        'Heart muscle contracts nonstop and needs a constant ATP supply.',
        'medium',
      ),
      mcq(
        'Both mitochondria and chloroplasts…',
        [
          ['Perform photosynthesis', 'Only chloroplasts do.'],
          ['Have their own DNA and ribosomes', 'Correct.'],
          ['Are found in animal cells', 'Chloroplasts are not.'],
          ['Have a single membrane', 'Both have double membranes.'],
        ],
        1,
        'Their own DNA and 70S ribosomes support the endosymbiotic theory.',
        'hard',
      ),
    ],
  },

  cellDivision: {
    curiosity:
      'You started life as a single cell. Today you are made of trillions, and almost every one has a perfect copy of the same DNA. How does a cell copy itself without making errors in 3 billion letters?',
    curiosityQuestion: hook(
      'A human skin cell with 46 chromosomes divides by mitosis. How many chromosomes does each daughter cell have?',
      ['23', '46', '92'],
      1,
      'Mitosis gives two daughter cells genetically identical to the parent, so each keeps 46 chromosomes.',
    ),
    easy: 'Cells divide in two ways:\n\n**Mitosis** — for growth and repair.\n- One cell → **two identical** daughter cells.\n- Chromosome number stays the same (46 → 46 in humans): **diploid (2n)**.\n- Phases: **Prophase, Metaphase, Anaphase, Telophase** (remember **PMAT**), then the cytoplasm splits (**cytokinesis**).\n\n**Meiosis** — for making sex cells (gametes: sperm and egg).\n- One cell → **four different** daughter cells.\n- Chromosome number is **halved** (46 → 23): **haploid (n)**.\n- Two rounds of division (Meiosis I and II); **crossing over** swaps DNA between paired chromosomes, so every gamete is unique.\n\nBefore either division, the cell copies its DNA in the **S phase of interphase**.',
    tenMark:
      '## Introduction\nCell division is the process by which a parent cell divides into daughter cells. It is part of the **cell cycle**: Interphase (G₁ → S → G₂) followed by the M phase (division).\n\n## Interphase\n- **G₁:** cell grows and makes proteins.\n- **S:** DNA is replicated; each chromosome now has two sister chromatids.\n- **G₂:** cell prepares for division.\n\n## Mitosis (equational division)\n1. **Prophase:** chromatin condenses into chromosomes; nuclear envelope breaks; spindle forms.\n2. **Metaphase:** chromosomes line up at the equator (metaphase plate).\n3. **Anaphase:** centromeres split; sister chromatids move to opposite poles.\n4. **Telophase:** nuclear envelopes re-form; chromosomes uncoil.\n5. **Cytokinesis:** cytoplasm divides (furrow in animals, cell plate in plants).\n\nResult: 2 genetically identical diploid cells. Purpose: growth, repair, asexual reproduction.\n\n## Meiosis (reduction division)\n- **Meiosis I:** homologous chromosomes pair (synapsis) and **cross over** in Prophase I; homologues separate in Anaphase I → 2 haploid cells.\n- **Meiosis II:** like mitosis; sister chromatids separate → 4 haploid cells.\n\nResult: 4 genetically different haploid gametes. Purpose: sexual reproduction and variation.\n\n## Mitosis vs meiosis\n| Feature | Mitosis | Meiosis |\n|---|---|---|\n| Divisions | One | Two |\n| Daughter cells | 2 | 4 |\n| Chromosome number | Same (2n) | Halved (n) |\n| Genetic make-up | Identical | Different |\n| Crossing over | No | Yes |\n| Occurs in | Body (somatic) cells | Reproductive cells |\n\n## Significance\n- Mitosis keeps the chromosome number constant and repairs tissue.\n- Meiosis keeps the chromosome number constant across generations and creates genetic variation.\n- Uncontrolled mitosis causes **cancer**.\n\n## Conclusion\nMitosis copies, meiosis shuffles: one builds the body, the other builds diversity.',
    realWorld:
      '- **Cancer** is uncontrolled mitosis; many chemotherapy drugs stop the spindle from forming.\n- **Wound healing** and skin grafts rely on mitosis.\n- **Cell-culture labs** grow cells by mitosis to make vaccines and test drugs.\n- **Genetic algorithms** in computing borrow “crossover” from meiosis to mix candidate solutions.',
    flashcards: [
      ['Phases of mitosis?', 'Prophase, Metaphase, Anaphase, Telophase (PMAT), then cytokinesis.'],
      ['Mitosis result?', 'Two identical diploid daughter cells.'],
      ['Meiosis result?', 'Four genetically different haploid gametes.'],
      ['When is DNA replicated?', 'In the S phase of interphase.'],
      [
        'What is crossing over?',
        'Exchange of DNA between homologous chromosomes in Prophase I of meiosis.',
      ],
    ],
    mcqs: [
      mcq(
        'Chromosomes line up at the equator during…',
        [
          ['Prophase', 'In prophase chromosomes condense.'],
          ['Metaphase', 'Correct.'],
          ['Anaphase', 'In anaphase chromatids separate.'],
          ['Telophase', 'In telophase nuclei re-form.'],
        ],
        1,
        'At metaphase the chromosomes sit on the metaphase plate.',
      ),
      mcq(
        'Meiosis produces…',
        [
          ['2 diploid cells', 'That is mitosis.'],
          ['4 haploid cells', 'Correct.'],
          ['4 diploid cells', 'Meiosis halves the chromosome number.'],
          ['2 haploid cells', 'That is only after Meiosis I.'],
        ],
        1,
        'Two divisions give four haploid gametes.',
      ),
      mcq(
        'Crossing over occurs in…',
        [
          ['Prophase of mitosis', 'Homologues do not pair in mitosis.'],
          ['Prophase I of meiosis', 'Correct.'],
          ['Anaphase II', 'Sister chromatids separate then.'],
          ['Interphase', 'DNA is copied then, not exchanged.'],
        ],
        1,
        'Paired homologous chromosomes exchange segments in Prophase I.',
        'medium',
      ),
      mcq(
        'A human gamete contains…',
        [
          ['46 chromosomes', 'That is a body cell.'],
          ['23 chromosomes', 'Correct.'],
          ['92 chromosomes', 'That is after replication, before division.'],
          ['44 chromosomes', '44 is the number of autosomes in a body cell.'],
        ],
        1,
        'Gametes are haploid: 23 chromosomes.',
      ),
      mcq(
        'Uncontrolled mitosis leads to…',
        [
          ['Genetic variation', 'Variation comes from meiosis.'],
          ['Cancer', 'Correct.'],
          ['Gamete formation', 'Gametes form by meiosis.'],
          ['Photosynthesis', 'Unrelated.'],
        ],
        1,
        'A tumour is a mass of cells dividing without control.',
      ),
    ],
  },

  cellApps: {
    curiosity:
      'Companies now grow real meat in steel tanks without raising animals, and labs test new medicines on “organs on a chip” the size of a USB stick. What makes this possible?',
    curiosityQuestion: hook(
      'What do lab-grown meat and organ-on-a-chip devices both rely on?',
      [
        'Growing living cells outside the body under controlled conditions',
        'Printing plastic shaped like tissue',
        'Freezing animal organs',
      ],
      0,
      'Both depend on cell culture: keeping cells alive and dividing in a controlled artificial environment.',
    ),
    easy: 'Engineers treat cells as **tiny programmable factories and sensors**:\n\n- **Cell culture** — growing cells outside the body in a nutrient medium at 37 °C. Used to make vaccines, test drugs and study disease.\n- **Stem cells** — unspecialised cells that can divide and turn into other cell types. Used to repair tissue (e.g. bone-marrow transplants).\n- **Microbial factories** — bacteria and yeast produce insulin, enzymes and biofuels.\n- **Lab-on-a-chip / organ-on-a-chip** — tiny channels carry fluid past living cells to test drugs quickly.\n- **Biosensors** — cells or their parts detect chemicals and give an electrical signal.\n\nEngineering skills such as **fluid flow, control systems, sensors and data analysis** are what make these technologies work.',
    tenMark:
      '## Introduction\nCell biology underpins biotechnology and many engineering fields. Knowing how cells grow, divide and respond lets engineers design products and processes around them.\n\n## Applications\n### 1. Cell and tissue culture\nCells are grown in sterile flasks or bioreactors with nutrient media, controlled temperature (37 °C), pH and CO₂ (5%). Uses: vaccine production, drug toxicity testing, cancer research.\n\n### 2. Stem-cell technology\nStem cells self-renew and differentiate into specialised cells. Embryonic stem cells are pluripotent; adult stem cells (bone marrow) are multipotent; **induced pluripotent stem cells (iPSCs)** are made by reprogramming skin cells. Uses: regenerative medicine, disease models.\n\n### 3. Microbial cell factories\nRecombinant bacteria and yeast produce insulin, growth hormone, enzymes and vaccines in fermenters.\n\n### 4. Lab-on-a-chip and organ-on-a-chip\nMicrofluidic devices with living cells mimic organs such as lungs and liver to test drugs faster and with fewer animals.\n\n### 5. Biosensors and diagnostics\nCells and cell components (enzymes, antibodies) detect toxins, glucose or pathogens.\n\n### 6. Tissue engineering\nCells seeded on scaffolds form skin grafts, cartilage and blood vessels.\n\n### 7. Cultured (lab-grown) meat\nMuscle stem cells grown in bioreactors produce meat without slaughter.\n\n## Role of the engineer\n| Engineering skill | Use in cell technology |\n|---|---|\n| Control systems | Keep temperature, pH and O₂ constant in bioreactors |\n| Fluid mechanics | Design microfluidic chips |\n| Electronics | Build cell-based sensors |\n| Computing / AI | Analyse microscope images and cell data |\n\n## Conclusion\nCells are living machines; engineering lets us culture, control and scale them for medicine, food and industry.',
    realWorld:
      '- **Covaxin** (Bharat Biotech) was produced by growing virus in Vero cell culture.\n- **Organ-on-a-chip** devices are used by drug companies to test toxicity before human trials.\n- **AI image analysis** counts and classifies cells in culture automatically.\n- **Bone-marrow (stem cell) transplants** treat leukaemia in Indian hospitals such as AIIMS and CMC Vellore.',
    flashcards: [
      ['Cell culture?', 'Growing cells outside the body under controlled conditions.'],
      [
        'Stem cell?',
        'An unspecialised cell that can self-renew and differentiate into other cell types.',
      ],
      [
        'iPSCs?',
        'Induced pluripotent stem cells: adult cells reprogrammed to behave like embryonic stem cells.',
      ],
      [
        'Organ-on-a-chip?',
        'A microfluidic device with living cells that mimics an organ for testing.',
      ],
      [
        'Typical culture conditions for human cells?',
        '37 °C, pH about 7.4, 5% CO₂, sterile nutrient medium.',
      ],
    ],
    mcqs: [
      mcq(
        'Cells that can become many different cell types are called…',
        [
          ['Stem cells', 'Correct.'],
          ['Red blood cells', 'RBCs are fully specialised.'],
          ['Neurons', 'Neurons are specialised and rarely divide.'],
          ['Gametes', 'Gametes are for reproduction.'],
        ],
        0,
        'Stem cells are unspecialised and can differentiate.',
      ),
      mcq(
        'Human cell cultures are usually kept at…',
        [
          ['4 °C', 'That is refrigeration; cells would not grow.'],
          ['25 °C', 'Too cold for human cells.'],
          ['37 °C', 'Correct.'],
          ['60 °C', 'This would denature proteins.'],
        ],
        2,
        '37 °C matches normal body temperature.',
      ),
      mcq(
        'iPSCs are made by…',
        [
          ['Fusing two eggs', 'That is not how iPSCs are made.'],
          ['Reprogramming adult cells', 'Correct.'],
          ['Freezing embryos', 'Freezing preserves cells; it does not reprogram them.'],
          ['Infecting bacteria', 'Bacteria are not involved.'],
        ],
        1,
        'Adult cells such as skin cells are reprogrammed with specific genes.',
        'medium',
      ),
      mcq(
        'An organ-on-a-chip mainly helps to…',
        [
          ['Store data', 'It is not a memory chip.'],
          ['Test drugs on living human cells without a full organism', 'Correct.'],
          ['Generate electricity', 'Not its purpose.'],
          ['Replace a heart permanently', 'It is a test device, not an implant.'],
        ],
        1,
        'It mimics organ function for drug testing and disease study.',
      ),
      mcq(
        'Which engineering skill keeps conditions constant in a bioreactor?',
        [
          ['Control systems', 'Correct.'],
          ['Surveying', 'Unrelated.'],
          ['Structural analysis', 'Not about controlling conditions.'],
          ['Highway design', 'Unrelated.'],
        ],
        0,
        'Feedback control holds temperature, pH and oxygen at set points.',
        'medium',
      ),
    ],
  },
};
