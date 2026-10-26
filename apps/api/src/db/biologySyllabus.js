import { layoutMap } from '@acet/shared';
import { CourseOutcome, TopicCO } from '../modules/outcomes/model.js';
import { Subject, Topic, TopicLink, Unit } from '../modules/syllabus/model.js';

/**
 * The seeded Biology subject (BOT26105, Biology for Computer Engineers, BSC, 3-0-0, 3 credits),
 * Units I–V as given in the ACET 2026-27 regulation syllabus. Shared by `npm run seed`,
 * `npm run seed:content` and the tests.
 */
export const BIOLOGY_SUBJECT = {
  code: 'BOT26105',
  name: 'Biology for Computer Engineers',
  semester: 1,
};

export const BIOLOGY_UNITS = [
  { number: 1, title: 'Cell Biology' },
  { number: 2, title: 'Biomolecules and Enzymes' },
  { number: 3, title: 'Genetics and Biotechnology' },
  { number: 4, title: 'Microbiology and Environmental Biology' },
  { number: 5, title: 'Bioengineering and Biomedical Applications' },
];

export const BIOLOGY_TOPICS = [
  // Unit I
  {
    key: 'cellIntro',
    unit: 1,
    title: 'Introduction to Biology and the Cell',
    summary: 'What biology studies, the characteristics of life, and the cell as its basic unit.',
  },
  {
    key: 'cellTypes',
    unit: 1,
    title: 'Prokaryotic and Eukaryotic Cells',
    summary: 'Cells without a nucleus (bacteria) and cells with one (plants, animals, fungi).',
  },
  {
    key: 'membrane',
    unit: 1,
    title: 'Cell Membrane',
    summary: 'The fluid mosaic boundary that controls what enters and leaves the cell.',
  },
  {
    key: 'organelles',
    unit: 1,
    title: 'Nucleus, Mitochondria and Chloroplast',
    summary: 'The control centre, the power house and the solar panel of the cell.',
  },
  {
    key: 'cellDivision',
    unit: 1,
    title: 'Cell Division: Mitosis and Meiosis',
    summary: 'How one cell makes two identical copies, or four gametes with half the DNA.',
  },
  {
    key: 'cellApps',
    unit: 1,
    title: 'Cell Biology in Engineering and Biotechnology',
    summary: 'Cell culture, stem cells, lab-on-a-chip and cells as tiny factories.',
  },
  // Unit II
  {
    key: 'carbohydrates',
    unit: 2,
    title: 'Carbohydrates',
    summary: 'Sugars and starches: monosaccharides, disaccharides and polysaccharides.',
  },
  {
    key: 'proteins',
    unit: 2,
    title: 'Proteins',
    summary: 'Chains of amino acids folded into four levels of structure that do most cell work.',
  },
  {
    key: 'lipids',
    unit: 2,
    title: 'Lipids',
    summary: 'Fats, oils, phospholipids and steroids: energy stores and membrane builders.',
  },
  {
    key: 'nucleicAcids',
    unit: 2,
    title: 'Nucleic Acids: DNA and RNA',
    summary: 'The information molecules: structure of DNA and RNA and how they differ.',
  },
  {
    key: 'enzymes',
    unit: 2,
    title: 'Enzymes: Classification and Mechanism',
    summary: 'Biological catalysts, the six EC classes, lock-and-key and induced fit.',
  },
  {
    key: 'enzymeFactors',
    unit: 2,
    title: 'Factors Affecting Enzyme Activity',
    summary: 'Temperature, pH, substrate and enzyme concentration, and inhibitors.',
  },
  {
    key: 'enzymeApps',
    unit: 2,
    title: 'Industrial and Biomedical Applications of Enzymes',
    summary: 'Enzymes in detergents, food, textiles, biofuels, diagnostics and medicine.',
  },
  // Unit III
  {
    key: 'mendel',
    unit: 3,
    title: "Principles of Genetics and Mendel's Laws",
    summary:
      'Genes, alleles, dominance and Mendel’s laws of segregation and independent assortment.',
  },
  {
    key: 'chromosomes',
    unit: 3,
    title: 'Chromosomes and Genes',
    summary: 'How DNA is packed into chromosomes and how a gene codes for a protein.',
  },
  {
    key: 'geneticEngineering',
    unit: 3,
    title: 'Genetic Engineering and Recombinant DNA Technology',
    summary: 'Cutting, pasting and copying genes with restriction enzymes, ligase and vectors.',
  },
  {
    key: 'pcr',
    unit: 3,
    title: 'Polymerase Chain Reaction (PCR)',
    summary: 'Copying a DNA segment millions of times with heat cycles and Taq polymerase.',
  },
  {
    key: 'cloning',
    unit: 3,
    title: 'Cloning',
    summary: 'Gene cloning, reproductive cloning (Dolly) and therapeutic cloning.',
  },
  {
    key: 'biotechApps',
    unit: 3,
    title: 'Applications of Biotechnology',
    summary: 'Insulin, vaccines, Bt cotton, golden rice, biofuels and enzymes for industry.',
  },
  // Unit IV
  {
    key: 'microbes',
    unit: 4,
    title: 'Microorganisms: Bacteria, Fungi and Viruses',
    summary: 'The microbial world, its three main groups and how they differ.',
  },
  {
    key: 'microbialGrowth',
    unit: 4,
    title: 'Microbial Growth',
    summary: 'Binary fission, generation time and the lag, log, stationary and death phases.',
  },
  {
    key: 'industrialMicro',
    unit: 4,
    title: 'Industrial Microbiology',
    summary: 'Fermentation and bioreactors that make antibiotics, food, enzymes and fuels.',
  },
  {
    key: 'waste',
    unit: 4,
    title: 'Waste Management and Bioremediation',
    summary: 'Composting, biogas, sewage treatment and microbes that clean polluted sites.',
  },
  {
    key: 'pollution',
    unit: 4,
    title: 'Environmental Pollution and Control',
    summary: 'Air, water, soil and e-waste pollution, their effects and how they are controlled.',
  },
  {
    key: 'sustainability',
    unit: 4,
    title: 'Sustainable Environmental Practices',
    summary: 'Reduce-reuse-recycle, renewable energy, green computing and the circular economy.',
  },
  // Unit V
  {
    key: 'bioengineering',
    unit: 5,
    title: 'Introduction to Bioengineering',
    summary: 'Applying engineering principles to living systems, and biology to engineering.',
  },
  {
    key: 'tissueEngineering',
    unit: 5,
    title: 'Tissue Engineering and Artificial Organs',
    summary: 'Scaffolds, cells and growth factors; artificial kidneys, hearts and 3D bioprinting.',
  },
  {
    key: 'biosensors',
    unit: 5,
    title: 'Biosensors',
    summary: 'A biological element plus a transducer: glucose meters, wearables and test strips.',
  },
  {
    key: 'biomedicalDevices',
    unit: 5,
    title: 'Biomedical Devices and Healthcare Engineering',
    summary: 'ECG, pacemakers, imaging, prosthetics and how engineering serves healthcare.',
  },
  {
    key: 'bioinformatics',
    unit: 5,
    title: 'Bioinformatics',
    summary: 'Computers for biological data: sequence databases, BLAST and genome analysis.',
  },
  {
    key: 'bioethics',
    unit: 5,
    title: 'Ethical Issues in Biotechnology and Biomedical Engineering',
    summary: 'Consent, privacy of genetic data, GM crops, cloning and fair access.',
  },
];

export const BIOLOGY_LINKS = [
  // Unit I
  {
    from: 'cellIntro',
    to: 'cellTypes',
    type: 'prerequisite',
    reason: 'You classify cells once you know what a cell is.',
  },
  {
    from: 'cellTypes',
    to: 'membrane',
    type: 'prerequisite',
    reason: 'Every cell, prokaryotic or eukaryotic, is bounded by a membrane.',
  },
  {
    from: 'cellTypes',
    to: 'organelles',
    type: 'prerequisite',
    reason: 'Nucleus, mitochondria and chloroplasts are what make a cell eukaryotic.',
  },
  {
    from: 'organelles',
    to: 'cellDivision',
    type: 'prerequisite',
    reason: 'Division starts with copying the DNA held in the nucleus.',
  },
  {
    from: 'cellDivision',
    to: 'cellApps',
    type: 'prerequisite',
    reason: 'Cell culture and stem-cell work depend on controlled cell division.',
  },
  {
    from: 'membrane',
    to: 'cellApps',
    type: 'related',
    reason: 'Drug delivery and biosensors work at the cell membrane.',
  },
  // Unit II
  {
    from: 'cellIntro',
    to: 'carbohydrates',
    type: 'prerequisite',
    reason: 'Biomolecules are what cells are built from.',
  },
  {
    from: 'carbohydrates',
    to: 'proteins',
    type: 'related',
    reason: 'Both are polymers made by joining small units through condensation.',
  },
  {
    from: 'membrane',
    to: 'lipids',
    type: 'related',
    reason: 'The membrane is a phospholipid bilayer.',
  },
  {
    from: 'proteins',
    to: 'enzymes',
    type: 'prerequisite',
    reason: 'Almost all enzymes are proteins; their shape decides what they do.',
  },
  {
    from: 'organelles',
    to: 'nucleicAcids',
    type: 'prerequisite',
    reason: 'DNA is stored in the nucleus and in mitochondria and chloroplasts.',
  },
  {
    from: 'enzymes',
    to: 'enzymeFactors',
    type: 'prerequisite',
    reason: 'Factors change the rate by changing the enzyme or its active site.',
  },
  {
    from: 'enzymeFactors',
    to: 'enzymeApps',
    type: 'prerequisite',
    reason: 'Industry picks enzymes that work at its temperature and pH.',
  },
  // Unit III
  {
    from: 'cellDivision',
    to: 'mendel',
    type: 'prerequisite',
    reason: 'Meiosis separates alleles, which is why Mendel’s laws hold.',
  },
  {
    from: 'nucleicAcids',
    to: 'chromosomes',
    type: 'prerequisite',
    reason: 'A chromosome is one long DNA molecule packed with proteins.',
  },
  {
    from: 'mendel',
    to: 'chromosomes',
    type: 'prerequisite',
    reason: 'Mendel’s “factors” turned out to be genes on chromosomes.',
  },
  {
    from: 'chromosomes',
    to: 'geneticEngineering',
    type: 'prerequisite',
    reason: 'You must know what a gene is before you cut and paste one.',
  },
  {
    from: 'enzymes',
    to: 'geneticEngineering',
    type: 'related',
    reason: 'Restriction enzymes and ligase are the scissors and glue of rDNA work.',
  },
  {
    from: 'nucleicAcids',
    to: 'pcr',
    type: 'prerequisite',
    reason: 'PCR copies DNA by separating and rebuilding its two strands.',
  },
  {
    from: 'geneticEngineering',
    to: 'cloning',
    type: 'prerequisite',
    reason: 'Gene cloning is recombinant DNA copied inside a host cell.',
  },
  {
    from: 'cloning',
    to: 'biotechApps',
    type: 'prerequisite',
    reason: 'Insulin and vaccines are made by cloned genes in microbes.',
  },
  {
    from: 'pcr',
    to: 'biotechApps',
    type: 'related',
    reason: 'PCR tests diagnose infections and identify people in forensics.',
  },
  // Unit IV
  {
    from: 'cellTypes',
    to: 'microbes',
    type: 'prerequisite',
    reason: 'Bacteria are prokaryotes and fungi are eukaryotes.',
  },
  {
    from: 'microbes',
    to: 'microbialGrowth',
    type: 'prerequisite',
    reason: 'Growth curves describe how a microbe population multiplies.',
  },
  {
    from: 'microbialGrowth',
    to: 'industrialMicro',
    type: 'prerequisite',
    reason: 'A fermenter is run to keep microbes in their most productive phase.',
  },
  {
    from: 'enzymeApps',
    to: 'industrialMicro',
    type: 'related',
    reason: 'Most industrial enzymes are produced by microbial fermentation.',
  },
  {
    from: 'industrialMicro',
    to: 'waste',
    type: 'prerequisite',
    reason: 'Composting, biogas and sewage treatment use the same microbes at scale.',
  },
  {
    from: 'waste',
    to: 'pollution',
    type: 'related',
    reason: 'Badly managed waste is a main source of pollution.',
  },
  {
    from: 'pollution',
    to: 'sustainability',
    type: 'prerequisite',
    reason: 'Sustainable practices are how pollution is prevented at the source.',
  },
  // Unit V
  {
    from: 'cellApps',
    to: 'bioengineering',
    type: 'prerequisite',
    reason: 'Bioengineering builds on using cells as engineering materials.',
  },
  {
    from: 'bioengineering',
    to: 'tissueEngineering',
    type: 'prerequisite',
    reason: 'Tissue engineering is bioengineering applied to replacing body parts.',
  },
  {
    from: 'enzymes',
    to: 'biosensors',
    type: 'prerequisite',
    reason: 'The glucose sensor uses the enzyme glucose oxidase as its biological element.',
  },
  {
    from: 'bioengineering',
    to: 'biomedicalDevices',
    type: 'prerequisite',
    reason: 'Biomedical devices are the products of bioengineering.',
  },
  {
    from: 'biosensors',
    to: 'biomedicalDevices',
    type: 'related',
    reason: 'Many devices, from glucose meters to smartwatches, are built around biosensors.',
  },
  {
    from: 'nucleicAcids',
    to: 'bioinformatics',
    type: 'prerequisite',
    reason: 'Bioinformatics analyses DNA, RNA and protein sequences.',
  },
  {
    from: 'biotechApps',
    to: 'bioethics',
    type: 'prerequisite',
    reason: 'Ethical questions arise from what biotechnology can now do.',
  },
  {
    from: 'bioinformatics',
    to: 'bioethics',
    type: 'related',
    reason: 'Genetic databases raise questions of privacy and consent.',
  },
];

/** CO1–CO5 from the syllabus, with the topics each one covers. No CO–PO mapping is given yet. */
export const BIOLOGY_COS = [
  {
    code: 'CO1',
    text: 'Understand the structure and functions of cells and biomolecules. (K2)',
    topics: [
      'cellIntro',
      'cellTypes',
      'membrane',
      'organelles',
      'carbohydrates',
      'proteins',
      'lipids',
      'nucleicAcids',
    ],
  },
  {
    code: 'CO2',
    text: 'Explain biological processes and metabolic pathways relevant to engineering. (K2)',
    topics: ['cellDivision', 'enzymes', 'enzymeFactors', 'microbialGrowth', 'industrialMicro'],
  },
  {
    code: 'CO3',
    text: 'Apply genetics and biotechnology concepts in engineering applications. (K3)',
    topics: [
      'mendel',
      'chromosomes',
      'geneticEngineering',
      'pcr',
      'cloning',
      'biotechApps',
      'enzymeApps',
      'cellApps',
    ],
  },
  {
    code: 'CO4',
    text: 'Analyse environmental and biomedical applications of biology. (K4)',
    topics: [
      'microbes',
      'pollution',
      'bioengineering',
      'tissueEngineering',
      'biosensors',
      'biomedicalDevices',
      'bioinformatics',
      'bioethics',
    ],
  },
  {
    code: 'CO5',
    text: 'Interpret the role of biological systems in sustainable engineering solutions. (K5)',
    topics: ['waste', 'sustainability'],
  },
];

/**
 * Creates the Biology subject with its units, topics, links and course outcomes (idempotency is
 * the caller's job).
 * @returns {Promise<{ subject: any, units: Record<number, any>, topics: Record<string, any>, links: any[] }>}
 */
export async function createBiologySubject({
  syllabusVersionId,
  facultyIds = [],
  status = 'approved',
}) {
  const subject = await Subject.create({ ...BIOLOGY_SUBJECT, syllabusVersionId, facultyIds });
  const units = {};
  for (const u of BIOLOGY_UNITS)
    units[u.number] = await Unit.create({ ...u, subjectId: subject._id });
  const positions = layoutMap(
    BIOLOGY_TOPICS.map((t) => ({ id: t.key, unitId: String(t.unit) })),
    BIOLOGY_LINKS.map((l) => ({ fromTopicId: l.from, toTopicId: l.to, type: l.type })),
    { unitOrder: BIOLOGY_UNITS.map((u) => String(u.number)) },
  );
  const topics = {};
  for (const [i, t] of BIOLOGY_TOPICS.entries()) {
    topics[t.key] = await Topic.create({
      unitId: units[t.unit]._id,
      subjectId: subject._id,
      title: t.title,
      summary: t.summary,
      order: i,
      position: positions[t.key],
      status,
    });
  }
  const links = await TopicLink.insertMany(
    BIOLOGY_LINKS.map((l) => ({
      subjectId: subject._id,
      fromTopicId: topics[l.from]._id,
      toTopicId: topics[l.to]._id,
      type: l.type,
      reason: l.reason,
      status,
    })),
  );
  for (const co of BIOLOGY_COS) {
    const doc = await CourseOutcome.create({
      subjectId: subject._id,
      code: co.code,
      text: co.text,
    });
    await TopicCO.insertMany(co.topics.map((k) => ({ coId: doc._id, topicId: topics[k]._id })));
  }
  return { subject, units, topics, links };
}
