/**
 * Faculty-authored demo content for the seeded Biology subject (BOT26105, Biology for Computer
 * Engineers), Units I–V, written from the ACET 2026-27 syllabus. Seeded as published by the
 * subject's faculty. Each unit lives in its own file (biologyContentUnit1–5.js).
 *
 * Videos are public YouTube lectures found by title on youtube.com on 2026-10-26 (channel noted
 * where known); faculty can replace any of them in the studio.
 */
import { BIOLOGY_UNIT1 } from './biologyContentUnit1.js';
import { BIOLOGY_UNIT2 } from './biologyContentUnit2.js';
import { BIOLOGY_UNIT3 } from './biologyContentUnit3.js';
import { BIOLOGY_UNIT4 } from './biologyContentUnit4.js';
import { BIOLOGY_UNIT5 } from './biologyContentUnit5.js';

const yt = (title, id) => ({ title, url: `https://www.youtube.com/watch?v=${id}` });

/** One video per topic, keyed like BIOLOGY_TOPICS. */
export const BIOLOGY_VIDEOS = {
  // Unit I
  cellIntro: yt('Introduction to Cells: The Grand Cell Tour (Amoeba Sisters)', '8IlzKri08kk'),
  cellTypes: yt('Prokaryotic vs. Eukaryotic Cells (Amoeba Sisters)', 'Pxujitlv8wc'),
  membrane: yt('Inside the Cell Membrane (Amoeba Sisters)', 'qBCVVszQQNs'),
  organelles: yt('Cell Organelles and Structures Review (Amoeba Sisters)', '6mgkoqcm6Sg'),
  cellDivision: yt('Mitosis vs. Meiosis: Side by Side Comparison (Amoeba Sisters)', 'zrKdz93WlVk'),
  cellApps: yt('Stem Cells: Explained in Simple Words', 'MQXZ7cGZo1w'),
  // Unit II
  carbohydrates: yt(
    'Biological Molecules – You Are What You Eat (Crash Course Biology #3)',
    'H8WJ2KENlK0',
  ),
  proteins: yt('Four Levels of Protein Structure', '3SQxHo3ODxY'),
  lipids: yt('Lipid overview (Khan Academy)', 'Ezp8F7XJHWE'),
  nucleicAcids: yt('DNA vs RNA (Amoeba Sisters)', 'JQByjprj_mA'),
  enzymes: yt('Enzymes (Amoeba Sisters)', 'qgVFkRn8f10'),
  enzymeFactors: yt(
    'Factors Affecting Enzyme Activity – pH, Temperature, Competitive and Noncompetitive Inhibition',
    'no36EgNHg6s',
  ),
  enzymeApps: yt('Industrial applications of enzymes', 'XHATAHRtb4M'),
  // Unit III
  mendel: yt('Mendel’s Laws', 'UQiRDujpM_8'),
  chromosomes: yt(
    'DNA, Chromosomes, Genes, and Traits: An Intro to Heredity (Amoeba Sisters)',
    '8m6hHRlKwxY',
  ),
  geneticEngineering: yt('Recombinant DNA Technology Animation', '8bjSqWj9Iyw'),
  pcr: yt('PCR (Polymerase Chain Reaction) (Amoeba Sisters)', 'a5jmdh9AnS4'),
  cloning: yt('How to clone – How Dolly the sheep was cloned', 'NpaBgvTpfLY'),
  biotechApps: yt(
    'Applications of biotechnology in food, pharmaceuticals and agricultural industries',
    'KsmRmk_ARos',
  ),
  // Unit IV
  microbes: yt('Bacteria (Amoeba Sisters)', 'ORB866QSGv8'),
  microbialGrowth: yt('Bacterial Growth Curve', 'SCTMQNmZtdw'),
  industrialMicro: yt('Microbial fermentation Process and Bioreactor design', '4KLO7d4D58s'),
  waste: yt(
    'Bioremediation: principle, methods, techniques, advantages and disadvantages',
    'Qxqg3iHTxUE',
  ),
  pollution: yt('Pollution: Crash Course Ecology #11', 'kdDSRRCKMiI'),
  sustainability: yt('Sustainable Development Explained', 'GhhQ9f0flds'),
  // Unit V
  bioengineering: yt('The Impact of Bioengineering', '8vsd9898ZO8'),
  tissueEngineering: yt('Tissue Engineering Explained', '4jRnEsmrHF4'),
  biosensors: yt(
    'Biosensors (principle, components and mechanisms, features, and applications)',
    'nxySi4rJkQE',
  ),
  biomedicalDevices: yt('What is a pacemaker and how does it work?', 'DoYDhVrjBbY'),
  bioinformatics: yt('A brief intro to Bioinformatics', 'f1Y_uippngU'),
  bioethics: yt('Designer Babies: The Science and Ethics of Genetic Engineering', 'k1a2larfMIA'),
};

const UNITS = {
  ...BIOLOGY_UNIT1,
  ...BIOLOGY_UNIT2,
  ...BIOLOGY_UNIT3,
  ...BIOLOGY_UNIT4,
  ...BIOLOGY_UNIT5,
};

export const BIOLOGY_CONTENT = Object.fromEntries(
  Object.entries(UNITS).map(([key, c]) => [key, { video: BIOLOGY_VIDEOS[key], ...c }]),
);

/** The Biology subject's root page. */
export const BIOLOGY_OVERVIEW = {
  tagline:
    'Life is the most advanced technology on Earth. Learn how it works, and how engineers use it.',
  why:
    'Cells store data in DNA, run on enzymes and sense their surroundings better than any chip. ' +
    'Today’s biggest technologies — **AI drug discovery, genome sequencing, biosensors, wearables, medical imaging and green manufacturing** — all sit where biology meets computing. ' +
    'This course gives you enough biology to work on those problems, and to understand the ethics that come with them.',
  prerequisites: [
    {
      title: 'Higher-secondary biology',
      why: 'Cells, DNA and the human body are revisited here at engineering depth.',
    },
    {
      title: 'Basic chemistry',
      why: 'Biomolecules and enzymes are chemistry: bonds, pH and reactions.',
    },
    {
      title: 'Curiosity about how things work',
      why: 'Every topic ends with how engineers use it.',
    },
  ],
  outcomes: [
    'CO1: Understand the structure and functions of cells and biomolecules.',
    'CO2: Explain biological processes and metabolic pathways relevant to engineering.',
    'CO3: Apply genetics and biotechnology concepts in engineering applications.',
    'CO4: Analyse environmental and biomedical applications of biology.',
    'CO5: Interpret the role of biological systems in sustainable engineering solutions.',
  ],
  applications: [
    {
      title: 'Bioinformatics and AI',
      description:
        'Algorithms read genomes, predict protein shapes (AlphaFold) and find drug targets.',
    },
    {
      title: 'Healthcare devices',
      description:
        'Glucometers, pacemakers, ECG wearables and imaging are embedded systems built on biology.',
    },
    {
      title: 'Biotechnology',
      description: 'Bacteria make insulin and vaccines; PCR diagnoses disease in hours.',
    },
    {
      title: 'Green engineering',
      description: 'Microbes clean pollution, make biofuels and turn waste into energy.',
    },
  ],
  careers: [
    'Bioinformatics engineer',
    'Biomedical device engineer',
    'Healthcare data scientist',
    'Computational biologist',
    'Environmental engineer',
  ],
  units: {
    1: {
      summary:
        'The cell as the basic unit of life: prokaryotic and eukaryotic cells, the membrane, nucleus, mitochondria and chloroplast, and cell division by mitosis and meiosis.',
      youWillBeAbleTo:
        'Draw and explain a cell, compare cell types and describe how cells divide, with engineering uses of each.',
      leadsTo:
        'Cells are built from molecules. Unit II looks inside them at carbohydrates, proteins, lipids, nucleic acids and the enzymes that run every reaction.',
    },
    2: {
      summary:
        'Structure and functions of carbohydrates, proteins, lipids, DNA and RNA; enzymes, their classification, mechanism, the factors affecting them, and their industrial and medical uses.',
      youWillBeAbleTo:
        'Explain each biomolecule, compare DNA with RNA, and predict how temperature, pH or an inhibitor changes enzyme activity.',
      leadsTo:
        'DNA carries the genetic code, and enzymes can cut and copy it. Unit III uses both for inheritance, genetic engineering, PCR and cloning.',
    },
    3: {
      summary:
        'Mendel’s laws, chromosomes and genes, recombinant DNA technology, PCR, cloning, and applications of biotechnology in medicine, agriculture and industry.',
      youWillBeAbleTo:
        'Solve monohybrid and dihybrid crosses and explain the steps of rDNA technology, PCR and cloning.',
      leadsTo:
        'Biotechnology depends on microbes. Unit IV studies microorganisms and how they make products and clean the environment.',
    },
    4: {
      summary:
        'Bacteria, fungi and viruses; microbial growth; industrial microbiology; waste management and bioremediation; pollution and its control; sustainable practices.',
      youWillBeAbleTo:
        'Read a microbial growth curve, explain a fermenter, and propose biological solutions to waste and pollution.',
      leadsTo:
        'Unit V turns biology into engineered products: tissues, organs, biosensors, medical devices and bioinformatics, and the ethics of using them.',
    },
    5: {
      summary:
        'Bioengineering, tissue engineering and artificial organs, biosensors, biomedical devices, bioinformatics, and ethical issues in biotechnology and biomedical engineering.',
      youWillBeAbleTo:
        'Explain how a biosensor or medical device works, use bioinformatics ideas, and argue the ethics of a biotechnology.',
      leadsTo: '',
    },
  },
};
