/**
 * Biology for Computer Engineers (BOT26105), Unit III: Genetics and Biotechnology.
 * Faculty-authored demo content, seeded as published. No videos yet: faculty add them in the studio.
 */
import { hook, mcq } from './biologyContentHelpers.js';

export const BIOLOGY_UNIT3 = {
  mendel: {
    curiosity:
      'Two brown-eyed parents can have a blue-eyed child, but two blue-eyed parents almost never have a brown-eyed child. A monk worked out why, using pea plants, 160 years ago. What did he discover?',
    curiosityQuestion: hook(
      'How can two brown-eyed parents have a blue-eyed child?',
      [
        'Both carry a hidden recessive allele for blue eyes and each passes it on',
        'Eye colour is random',
        'The child’s eyes change colour after birth',
      ],
      0,
      'Each parent is heterozygous (Bb); a child receiving b from both is bb and has blue eyes.',
    ),
    easy: '**Genetics** is the study of **heredity** (how traits pass from parents to offspring) and **variation**.\n\n**Gregor Mendel** (1822–1884), the *father of genetics*, crossed **pea plants** and counted the offspring.\n\nKey words:\n- **Gene** — a unit of heredity. **Alleles** — versions of a gene (T for tall, t for dwarf).\n- **Dominant** (T) shows even with one copy; **recessive** (t) shows only when there are two.\n- **Genotype** — the alleles (TT, Tt, tt). **Phenotype** — the visible trait (tall, dwarf).\n- **Homozygous** (TT or tt) vs **heterozygous** (Tt).\n\n**Mendel’s laws**\n1. **Law of dominance** — in a hybrid, one allele hides the other.\n2. **Law of segregation** — the two alleles separate when gametes form, so each gamete gets one.\n3. **Law of independent assortment** — genes for different traits are inherited independently.\n\nMonohybrid cross Tt × Tt → **3 : 1** phenotype ratio. Dihybrid cross → **9 : 3 : 3 : 1**.',
    tenMark:
      '## Introduction\nGenetics is the branch of biology dealing with heredity and variation. Gregor Johann Mendel, an Austrian monk, published his experiments on garden pea (*Pisum sativum*) in 1866; they were rediscovered in 1900 by de Vries, Correns and Tschermak.\n\n## Why the pea plant?\nShort life cycle, many seeds, easily self- and cross-pollinated, and seven pairs of clearly contrasting traits (tall/dwarf, round/wrinkled seeds, yellow/green seeds, etc.).\n\n## Terminology\n| Term | Meaning |\n|---|---|\n| Gene | Unit of heredity on a chromosome |\n| Allele | Alternative form of a gene |\n| Genotype | Genetic make-up (TT, Tt, tt) |\n| Phenotype | Observable trait |\n| Homozygous | Two identical alleles |\n| Heterozygous | Two different alleles |\n\n## Monohybrid cross\nP: TT (tall) × tt (dwarf) → F₁: all Tt (tall).\nF₁ self: Tt × Tt →\n| | T | t |\n|---|---|---|\n| **T** | TT | Tt |\n| **t** | Tt | tt |\nPhenotype ratio 3 tall : 1 dwarf; genotype ratio 1 TT : 2 Tt : 1 tt.\n\n## Mendel’s laws\n1. **Law of dominance:** in a heterozygote, the dominant allele is expressed and the recessive is masked.\n2. **Law of segregation (purity of gametes):** alleles separate during gamete formation; each gamete carries one allele.\n3. **Law of independent assortment:** alleles of different genes assort independently (from the dihybrid cross RrYy × RrYy → 9 : 3 : 3 : 1).\n\n## Test cross\nCrossing an organism with a homozygous recessive reveals whether it is TT or Tt: Tt × tt → 1 : 1.\n\n## Exceptions\nIncomplete dominance (snapdragon pink flowers, 1:2:1), co-dominance (AB blood group), linkage (genes close together on a chromosome are inherited together).\n\n## Conclusion\nMendel’s laws turned heredity into predictable probability, the basis of plant breeding, genetic counselling and genetic algorithms.',
    realWorld:
      '- **Genetic counselling** uses Punnett squares to predict the risk of disorders such as thalassaemia.\n- **Plant breeders** at ICAR use Mendelian crosses to develop high-yield, disease-resistant crops.\n- **Genetic algorithms** in computer science copy inheritance, crossover and mutation to evolve solutions.\n- **Blood-group inheritance** helps in paternity checks and transfusion matching.',
    flashcards: [
      ['Father of genetics?', 'Gregor Mendel.'],
      ['Monohybrid F₂ phenotype ratio?', '3 : 1.'],
      ['Dihybrid F₂ phenotype ratio?', '9 : 3 : 3 : 1.'],
      ['Law of segregation?', 'The two alleles of a gene separate during gamete formation.'],
      [
        'Purpose of a test cross?',
        'To find whether a dominant-looking organism is homozygous or heterozygous.',
      ],
    ],
    mcqs: [
      mcq(
        'Mendel worked with…',
        [
          ['Fruit flies', 'Morgan used fruit flies.'],
          ['Garden pea', 'Correct.'],
          ['Bacteria', 'Not Mendel’s organism.'],
          ['Mice', 'Not Mendel’s organism.'],
        ],
        1,
        'Mendel used Pisum sativum.',
      ),
      mcq(
        'Tt × Tt gives a phenotype ratio of…',
        [
          ['1 : 1', 'That is a test cross Tt × tt.'],
          ['3 : 1', 'Correct.'],
          ['1 : 2 : 1', 'That is the genotype ratio.'],
          ['9 : 3 : 3 : 1', 'That is a dihybrid cross.'],
        ],
        1,
        'Three show the dominant trait, one the recessive.',
      ),
      mcq(
        'An organism with genotype Tt is…',
        [
          ['Homozygous dominant', 'That is TT.'],
          ['Heterozygous', 'Correct.'],
          ['Homozygous recessive', 'That is tt.'],
          ['Haploid', 'It has two alleles, so it is diploid.'],
        ],
        1,
        'Two different alleles = heterozygous.',
      ),
      mcq(
        'The law of independent assortment comes from the…',
        [
          ['Monohybrid cross', 'That shows segregation and dominance.'],
          ['Dihybrid cross', 'Correct.'],
          ['Test cross', 'That checks genotype.'],
          ['Back cross with the parent only', 'Not the source of this law.'],
        ],
        1,
        'Two traits assort independently, giving 9:3:3:1.',
        'medium',
      ),
      mcq(
        'AB blood group is an example of…',
        [
          ['Complete dominance', 'Neither allele is hidden.'],
          ['Co-dominance', 'Correct.'],
          ['Incomplete dominance', 'That gives a blend.'],
          ['Linkage', 'Linkage concerns genes on one chromosome.'],
        ],
        1,
        'Both A and B alleles are fully expressed together.',
        'hard',
      ),
    ],
  },

  chromosomes: {
    curiosity:
      'If you stretched out the DNA from one of your cells it would be about 2 metres long, yet it fits inside a nucleus 100 times thinner than a hair. How is it packed?',
    curiosityQuestion: hook(
      'How does 2 m of DNA fit into a tiny nucleus?',
      [
        'It is wound around histone proteins and coiled many times into chromosomes',
        'It is cut into tiny pieces and thrown away',
        'The nucleus stretches to 2 m',
      ],
      0,
      'DNA wraps around histones to form nucleosomes, which coil further into chromatin and chromosomes.',
    ),
    easy: 'A **chromosome** is one long DNA molecule tightly packed with proteins called **histones**.\n\nPacking: DNA → wrapped around histones (**nucleosome**, “beads on a string”) → coiled **chromatin** → condensed **chromosome** (visible during cell division).\n\nParts of a chromosome: two **sister chromatids** joined at the **centromere**; the ends are **telomeres**.\n\nHumans have **46 chromosomes** (23 pairs): **22 pairs of autosomes** + **1 pair of sex chromosomes** (XX female, XY male).\n\nA **gene** is a segment of DNA that codes for a protein (or functional RNA). Humans have about **20,000 genes**. Genes are read in triplets called **codons** (e.g. AUG = start).\n\nA change in the DNA sequence is a **mutation**; a change in chromosome number causes disorders such as **Down syndrome** (three copies of chromosome 21).',
    tenMark:
      '## Introduction\nChromosomes are thread-like structures in the nucleus that carry genes. The term was coined by Waldeyer (1888). Sutton and Boveri’s **chromosome theory of inheritance** (1902) linked Mendel’s factors to chromosomes.\n\n## Structure of a chromosome\n- **Chromatids:** two identical halves after DNA replication.\n- **Centromere:** constriction joining the chromatids; spindle fibres attach at the **kinetochore**.\n- **Telomeres:** protective repeated sequences (TTAGGG) at the ends.\n- **Arms:** short (p) and long (q).\n- **Types by centromere position:** metacentric, submetacentric, acrocentric, telocentric.\n\n## DNA packaging\nDNA (2 nm) → nucleosome (DNA wound 1.65 turns around an 8-histone core, 11 nm) → 30 nm chromatin fibre → looped domains → condensed metaphase chromosome (about 1400 nm).\n- **Euchromatin:** loosely packed, active genes.\n- **Heterochromatin:** tightly packed, mostly inactive.\n\n## Human chromosomes\n46 chromosomes: 44 autosomes + 2 sex chromosomes (XX or XY). A **karyotype** is an ordered picture of them.\n\n## Genes\n- A gene is a DNA sequence coding for a polypeptide or functional RNA.\n- Eukaryotic genes have **exons** (coding) and **introns** (non-coding).\n- **Genetic code:** triplet codons; 64 codons for 20 amino acids; AUG start; UAA, UAG, UGA stop; universal and degenerate.\n- **Gene expression:** transcription (DNA → mRNA) and translation (mRNA → protein).\n\n## Mutations and disorders\n| Type | Example |\n|---|---|\n| Point mutation | Sickle-cell anaemia (one base change in haemoglobin gene) |\n| Trisomy | Down syndrome (21), Klinefelter (XXY) |\n| Monosomy | Turner syndrome (XO) |\n\n## Conclusion\nChromosomes are the physical carriers of genes; their structure and number determine health and are studied by karyotyping and genome sequencing.',
    realWorld:
      '- **Karyotyping** in prenatal screening detects Down syndrome.\n- **The Human Genome Project** (completed 2003) mapped about 20,000 genes — a huge data-engineering effort.\n- **Genome India Project** sequenced 10,000 Indian genomes to study population-specific diseases.\n- **Telomere length** is studied as a marker of cell ageing.',
    flashcards: [
      ['Proteins around which DNA is wound?', 'Histones.'],
      ['Human chromosome number?', '46 (22 pairs of autosomes + 1 pair of sex chromosomes).'],
      ['What is a gene?', 'A DNA segment that codes for a protein or functional RNA.'],
      ['Start codon?', 'AUG.'],
      ['Down syndrome cause?', 'Trisomy 21: three copies of chromosome 21.'],
    ],
    mcqs: [
      mcq(
        'The unit of DNA wound around histones is the…',
        [
          ['Nucleotide', 'A nucleotide is a monomer of DNA.'],
          ['Nucleosome', 'Correct.'],
          ['Ribosome', 'Ribosomes make proteins.'],
          ['Centromere', 'The centromere joins chromatids.'],
        ],
        1,
        'About 146 bp of DNA wrap around a histone octamer.',
        'medium',
      ),
      mcq(
        'A normal human male has sex chromosomes…',
        [
          ['XX', 'That is female.'],
          ['XY', 'Correct.'],
          ['XO', 'That is Turner syndrome.'],
          ['XXY', 'That is Klinefelter syndrome.'],
        ],
        1,
        'Males have one X and one Y.',
      ),
      mcq(
        'The protective ends of chromosomes are…',
        [
          ['Centromeres', 'Centromeres are in the middle.'],
          ['Telomeres', 'Correct.'],
          ['Kinetochores', 'Kinetochores attach spindle fibres.'],
          ['Introns', 'Introns are non-coding gene parts.'],
        ],
        1,
        'Telomeres prevent chromosome ends from fraying.',
      ),
      mcq(
        'How many codons are there in the genetic code?',
        [
          ['20', 'That is the number of amino acids.'],
          ['46', 'That is the human chromosome number.'],
          ['64', 'Correct.'],
          ['4', 'That is the number of bases.'],
        ],
        2,
        '4³ = 64 possible triplets.',
        'medium',
      ),
      mcq(
        'Sickle-cell anaemia is caused by…',
        [
          ['An extra chromosome', 'That causes trisomies.'],
          ['A point mutation', 'Correct.'],
          ['A missing X chromosome', 'That is Turner syndrome.'],
          ['A virus', 'It is inherited.'],
        ],
        1,
        'A single base change replaces glutamic acid with valine in haemoglobin.',
        'medium',
      ),
    ],
  },

  geneticEngineering: {
    curiosity:
      'Until 1982, diabetics injected insulin extracted from pig and cow pancreases. Today almost all insulin is made by bacteria. How did a bacterium learn to make a human protein?',
    curiosityQuestion: hook(
      'How do bacteria produce human insulin?',
      [
        'The human insulin gene is inserted into a bacterial plasmid',
        'Bacteria naturally make insulin',
        'Bacteria eat insulin and release it',
      ],
      0,
      'Recombinant DNA technology places the human gene into a plasmid; the bacterium then expresses it.',
    ),
    easy: '**Genetic engineering** means changing an organism’s DNA directly. The main method is **recombinant DNA (rDNA) technology** — joining DNA from two sources.\n\nThink of it as **cut, paste, copy**:\n\n1. **Isolate** the gene of interest (e.g. human insulin gene).\n2. **Cut** it and a **vector** (usually a bacterial **plasmid**) with the same **restriction enzyme** (“molecular scissors”, e.g. EcoRI). This leaves matching **sticky ends**.\n3. **Paste** the gene into the plasmid using **DNA ligase** (“molecular glue”) → **recombinant DNA**.\n4. **Insert** the rDNA into a host cell (e.g. *E. coli*) — **transformation**.\n5. **Select** cells that took it up using a **marker gene** (e.g. antibiotic resistance).\n6. **Grow** them in a fermenter so they make the product.\n\nNewer tool: **CRISPR-Cas9** edits genes precisely, like find-and-replace in a document.',
    tenMark:
      '## Introduction\nGenetic engineering is the direct manipulation of an organism’s genes using biotechnology. Recombinant DNA technology was developed by Stanley Cohen and Herbert Boyer (1973).\n\n## Tools of rDNA technology\n| Tool | Role | Example |\n|---|---|---|\n| Restriction endonucleases | Cut DNA at specific palindromic sites | EcoRI (G↓AATTC), HindIII |\n| DNA ligase | Joins DNA fragments | T4 DNA ligase |\n| Vectors | Carry the gene into the host | Plasmid pBR322, bacteriophage, Ti plasmid |\n| Host | Copies and expresses the gene | E. coli, yeast |\n| Marker genes | Identify transformed cells | Ampicillin resistance, lacZ |\n\n## Features of a good vector\nOrigin of replication (ori), selectable marker, unique restriction sites (cloning sites), small size.\n\n## Steps\n1. **Isolation of DNA** from the donor (cell lysis, removing proteins and RNA).\n2. **Cutting** the gene and vector with the same restriction enzyme → complementary sticky ends.\n3. **Ligation:** DNA ligase joins the gene into the vector → recombinant DNA.\n4. **Transformation:** rDNA introduced into host (heat shock with CaCl₂, electroporation, gene gun, microinjection).\n5. **Selection/screening:** antibiotic resistance or blue–white screening identifies recombinants.\n6. **Multiplication and expression:** grown in a bioreactor; product extracted and purified (**downstream processing**).\n\n## Gene editing: CRISPR-Cas9\nA guide RNA leads the Cas9 enzyme to a matching DNA sequence, where it cuts; the cell repairs the cut, disabling or replacing the gene. (Nobel Prize 2020: Charpentier and Doudna.)\n\n## Applications\nHuman insulin (Humulin, 1982), growth hormone, hepatitis B vaccine, Bt cotton, gene therapy.\n\n## Conclusion\nrDNA technology treats DNA as editable code — cut, paste, copy and run — and is the foundation of modern biotechnology.',
    realWorld:
      '- **Recombinant insulin** is produced in India by companies such as Biocon and Wockhardt.\n- **Hepatitis B vaccine** is made in yeast carrying a viral gene.\n- **CRISPR therapy** (Casgevy, approved 2023) treats sickle-cell disease.\n- **Bioinformatics software** designs primers, maps restriction sites and plans CRISPR guides.',
    flashcards: [
      ['Molecular scissors?', 'Restriction endonucleases (e.g. EcoRI).'],
      ['Molecular glue?', 'DNA ligase.'],
      ['Most common vector?', 'Bacterial plasmid (e.g. pBR322).'],
      ['Transformation?', 'Introducing recombinant DNA into a host cell.'],
      [
        'CRISPR-Cas9?',
        'A guide-RNA-directed enzyme that cuts DNA at a chosen sequence for gene editing.',
      ],
    ],
    mcqs: [
      mcq(
        'Restriction enzymes are used to…',
        [
          ['Join DNA', 'Ligase joins DNA.'],
          ['Cut DNA at specific sites', 'Correct.'],
          ['Copy DNA', 'Polymerase copies DNA.'],
          ['Make protein', 'Ribosomes make protein.'],
        ],
        1,
        'They recognise palindromic sequences and cut there.',
      ),
      mcq(
        'Which is a commonly used cloning vector?',
        [
          ['Ribosome', 'Not a vector.'],
          ['Plasmid', 'Correct.'],
          ['Mitochondrion', 'Not used as a vector.'],
          ['Histone', 'A protein, not a vector.'],
        ],
        1,
        'Plasmids replicate independently and can carry inserted genes.',
      ),
      mcq(
        'Recombinant DNA technology was first developed by…',
        [
          ['Watson and Crick', 'They found DNA structure.'],
          ['Cohen and Boyer', 'Correct.'],
          ['Mendel', 'Mendel studied inheritance.'],
          ['Kary Mullis', 'Mullis invented PCR.'],
        ],
        1,
        'Cohen and Boyer made the first recombinant plasmid in 1973.',
        'medium',
      ),
      mcq(
        'Antibiotic-resistance genes in vectors serve as…',
        [
          ['Selectable markers', 'Correct.'],
          ['Origins of replication', 'Ori starts replication.'],
          ['Promoters', 'Promoters start transcription.'],
          ['Restriction sites', 'Sites are where cutting happens.'],
        ],
        0,
        'Only transformed cells survive on the antibiotic medium.',
        'medium',
      ),
      mcq(
        'In CRISPR-Cas9, the guide RNA…',
        [
          ['Cuts the DNA', 'Cas9 cuts.'],
          ['Leads Cas9 to the target sequence', 'Correct.'],
          ['Joins DNA', 'Ligase joins.'],
          ['Makes protein', 'Not its role.'],
        ],
        1,
        'The guide RNA base-pairs with the target DNA.',
        'hard',
      ),
    ],
  },

  pcr: {
    curiosity:
      'During COVID-19, labs tested a tiny nasal swab with almost no virus in it and still got a clear answer within hours. How do you detect something you can barely find?',
    curiosityQuestion: hook(
      'How does an RT-PCR test detect a virus from a tiny sample?',
      [
        'It makes millions of copies of the viral genetic material until it can be detected',
        'It looks at the virus with a light microscope',
        'It weighs the swab',
      ],
      0,
      'PCR doubles the target DNA every cycle; after about 30 cycles there are over a billion copies.',
    ),
    easy: '**PCR (Polymerase Chain Reaction)** is a **DNA photocopier**. Invented by **Kary Mullis** (1983, Nobel Prize 1993).\n\nIngredients: **template DNA**, two **primers** (short DNA that mark the start and end of the target), **dNTPs** (A, T, G, C building blocks), **Taq polymerase** (heat-stable enzyme from a hot-spring bacterium) and buffer.\n\nEach cycle has 3 steps in a **thermal cycler**:\n\n1. **Denaturation (~94–95 °C)** — the two DNA strands separate.\n2. **Annealing (~50–65 °C)** — primers stick to the matching ends.\n3. **Extension (~72 °C)** — Taq polymerase builds new strands.\n\nEvery cycle **doubles** the DNA: after *n* cycles there are **2ⁿ** copies. 30 cycles ≈ **1 billion** copies in about 2 hours.\n\n**RT-PCR** first converts RNA to DNA with reverse transcriptase (used for RNA viruses like SARS-CoV-2).',
    tenMark:
      '## Introduction\nPolymerase Chain Reaction is an in-vitro technique to amplify a specific DNA segment exponentially. It was developed by Kary Mullis in 1983.\n\n## Requirements\n| Component | Role |\n|---|---|\n| Template DNA | Contains the target sequence |\n| Forward and reverse primers | 18–25 nt oligonucleotides flanking the target |\n| dNTPs | dATP, dTTP, dGTP, dCTP building blocks |\n| Taq DNA polymerase | Heat-stable enzyme from *Thermus aquaticus* |\n| Buffer with Mg²⁺ | Optimum conditions; Mg²⁺ is a cofactor |\n| Thermal cycler | Changes temperature automatically |\n\n## Steps of one cycle\n1. **Denaturation (94–96 °C, 30 s):** hydrogen bonds break; double-stranded DNA becomes single-stranded.\n2. **Annealing (50–65 °C, 30 s):** primers bind to complementary sequences on each strand.\n3. **Extension (72 °C, 1 min):** Taq polymerase adds dNTPs to the 3′ end of primers, making new complementary strands.\n\nCycles are repeated 25–35 times. Copies = 2ⁿ (n = cycles); 30 cycles → about 10⁹ copies.\n\n## Variants\n- **RT-PCR:** reverse transcriptase converts RNA to cDNA first.\n- **Real-time (qPCR):** fluorescent dyes measure DNA as it is made; Ct value indicates amount.\n- **Multiplex PCR:** several targets in one tube.\n\n## Applications\n1. Diagnosis of infections (COVID-19, TB, HIV).\n2. DNA fingerprinting in forensics and paternity.\n3. Detecting genetic disorders and mutations.\n4. Cloning and sequencing genes.\n5. GMO testing in food; ancient-DNA research.\n\n## Advantages and limitations\nFast, sensitive and specific; but contamination can give false positives, and primer design needs known sequence.\n\n## Conclusion\nPCR made DNA analysis fast and cheap; it is one of the most important tools in medicine, forensics and research.',
    realWorld:
      '- **RT-PCR** was the gold-standard COVID-19 test in India, with ICMR-approved labs in every district.\n- **TrueNat**, an Indian chip-based PCR machine, tests for TB and COVID-19 in small clinics.\n- **Forensic DNA profiling** identifies suspects and disaster victims.\n- **Thermal cyclers** are embedded systems: precise temperature control with microcontrollers and Peltier elements.',
    flashcards: [
      ['Inventor of PCR?', 'Kary Mullis (1983).'],
      ['Three steps of PCR?', 'Denaturation (~95 °C), annealing (~55 °C), extension (~72 °C).'],
      ['Why Taq polymerase?', 'It is heat-stable and survives the denaturation step.'],
      ['Copies after n cycles?', '2ⁿ.'],
      ['RT-PCR?', 'Reverse transcription of RNA to cDNA, then PCR; used for RNA viruses.'],
    ],
    mcqs: [
      mcq(
        'Taq polymerase is obtained from…',
        [
          ['E. coli', 'E. coli polymerase is not heat-stable.'],
          ['Thermus aquaticus', 'Correct.'],
          ['Yeast', 'Not the source.'],
          ['Human cells', 'Not the source.'],
        ],
        1,
        'A bacterium from hot springs whose enzymes survive high heat.',
      ),
      mcq(
        'The denaturation step happens at about…',
        [
          ['37 °C', 'Too low to separate strands.'],
          ['55 °C', 'That is annealing.'],
          ['72 °C', 'That is extension.'],
          ['95 °C', 'Correct.'],
        ],
        3,
        'High heat breaks hydrogen bonds between the strands.',
      ),
      mcq(
        'Starting from one DNA molecule, the number of copies after 10 cycles is…',
        [
          ['20', 'Growth is exponential, not linear.'],
          ['100', 'Not 2¹⁰.'],
          ['1024', 'Correct.'],
          ['10', 'That is the cycle count.'],
        ],
        2,
        '2¹⁰ = 1024.',
        'medium',
      ),
      mcq(
        'Primers in PCR…',
        [
          ['Cut DNA', 'Restriction enzymes cut.'],
          ['Mark where copying starts on each strand', 'Correct.'],
          ['Provide energy', 'dNTPs provide energy and bases.'],
          ['Join fragments', 'Ligase joins.'],
        ],
        1,
        'Polymerase extends from the 3′ end of each primer.',
      ),
      mcq(
        'RT-PCR is needed for SARS-CoV-2 because the virus has…',
        [
          ['A DNA genome', 'Then RT would not be needed.'],
          ['An RNA genome', 'Correct.'],
          ['No genome', 'All viruses have a genome.'],
          ['A protein genome', 'Genomes are nucleic acids.'],
        ],
        1,
        'RNA must first be converted to cDNA by reverse transcriptase.',
        'medium',
      ),
    ],
  },

  cloning: {
    curiosity:
      'In 1996 a sheep named Dolly was born with no father. She was a genetic copy of another sheep, made from a single udder cell. How is that possible?',
    curiosityQuestion: hook(
      'Dolly the sheep was created by…',
      [
        'Transferring the nucleus of a body cell into an egg with its nucleus removed',
        'Mixing the DNA of two sheep',
        'Growing a sheep from a single sperm',
      ],
      0,
      'Somatic cell nuclear transfer (SCNT) puts an adult nucleus into an enucleated egg.',
    ),
    easy: '**Cloning** means making **genetically identical copies** of a gene, cell or whole organism.\n\nThree kinds:\n\n1. **Gene (molecular) cloning** — copying a gene by putting it in a plasmid and letting bacteria multiply it. Used to make insulin and vaccines.\n2. **Reproductive cloning** — making a whole organism. **Dolly the sheep** (1996, Ian Wilmut, Roslin Institute) was made by **somatic cell nuclear transfer (SCNT)**:\n   - Take a body cell from sheep A; remove its **nucleus**.\n   - Take an egg from sheep B; remove its nucleus.\n   - Fuse them with an electric pulse; the embryo grows in surrogate sheep C.\n   - The lamb is a clone of **sheep A**.\n3. **Therapeutic cloning** — making cloned embryos only to obtain **stem cells** for treating disease.\n\nNature clones too: identical twins, bacteria (binary fission) and plant cuttings.',
    tenMark:
      '## Introduction\nCloning is the process of producing genetically identical copies of a biological entity — a DNA fragment, a cell or an organism. The word comes from the Greek *klon*, a twig.\n\n## Types of cloning\n### 1. Gene (molecular) cloning\n1. Isolate the gene and cut it and a vector with the same restriction enzyme.\n2. Ligate the gene into the vector (recombinant DNA).\n3. Transform host bacteria.\n4. Select recombinant colonies; each colony is a clone carrying the gene.\n5. Grow and harvest the gene or its protein.\n\n### 2. Reproductive cloning — SCNT\n1. **Donor cell:** a somatic cell (udder cell of a Finn Dorset sheep).\n2. **Enucleated egg:** egg from a Scottish Blackface ewe with its nucleus removed.\n3. **Fusion:** electric pulse fuses the donor nucleus with the egg and activates division.\n4. **Embryo culture:** grown to a blastocyst.\n5. **Implantation:** into a surrogate mother.\n6. **Birth:** offspring genetically identical to the nucleus donor.\nDolly (born 5 July 1996) was the first mammal cloned from an adult cell, out of 277 attempts.\n\n### 3. Therapeutic cloning\nSCNT embryos are grown for 5–6 days to harvest embryonic stem cells genetically matched to the patient, avoiding rejection.\n\n### 4. Plant cloning (micropropagation)\nTissue culture produces thousands of identical plantlets from a small explant.\n\n## Applications\n- Production of insulin, vaccines and enzymes (gene cloning).\n- Conservation of endangered species; cloning elite livestock.\n- Disease-free plants (banana, sugarcane).\n- Research models of disease.\n\n## Problems\nLow success rate, abnormalities, premature ageing, loss of genetic diversity, and ethical concerns, especially over human cloning (banned in most countries, including India).\n\n## Conclusion\nCloning ranges from routine gene copying in every biotech lab to the controversial copying of whole animals.',
    realWorld:
      '- **Garima**, the world’s first cloned buffalo calf, was produced at NDRI Karnal, India (2009).\n- **Tissue-cultured banana** plantlets, sold to Indian farmers, are clones free of disease.\n- **Gene cloning** in bacteria is a daily routine in biotech labs producing insulin and enzymes.\n- **Version control** in software (git clone) borrows the idea of an exact copy.',
    flashcards: [
      ['Cloning?', 'Making genetically identical copies of a gene, cell or organism.'],
      ['First mammal cloned from an adult cell?', 'Dolly the sheep (1996).'],
      [
        'SCNT?',
        'Somatic cell nuclear transfer: putting a body-cell nucleus into an enucleated egg.',
      ],
      ['Therapeutic cloning purpose?', 'To obtain patient-matched embryonic stem cells.'],
      ['First cloned buffalo in India?', 'Garima (NDRI Karnal, 2009).'],
    ],
    mcqs: [
      mcq(
        'Dolly the sheep is genetically identical to…',
        [
          ['The egg donor', 'The egg’s nucleus was removed.'],
          ['The surrogate mother', 'She only carried the embryo.'],
          ['The somatic (nucleus) donor', 'Correct.'],
          ['No other sheep', 'She was a clone.'],
        ],
        2,
        'Her nuclear DNA came from the udder cell donor.',
        'medium',
      ),
      mcq(
        'Dolly was created at the…',
        [
          ['Roslin Institute, Scotland', 'Correct.'],
          ['NDRI Karnal', 'NDRI cloned Garima the buffalo.'],
          ['MIT', 'Not where Dolly was made.'],
          ['CCMB Hyderabad', 'Not where Dolly was made.'],
        ],
        0,
        'Ian Wilmut and Keith Campbell led the work.',
      ),
      mcq(
        'Identical twins are an example of…',
        [
          ['Natural cloning', 'Correct.'],
          ['Gene therapy', 'Unrelated.'],
          ['Mutation', 'They are copies, not changes.'],
          ['Meiosis', 'Twinning happens after fertilisation.'],
        ],
        0,
        'One zygote splits into two genetically identical embryos.',
      ),
      mcq(
        'Therapeutic cloning aims to produce…',
        [
          ['A whole cloned person', 'That is reproductive cloning.'],
          ['Patient-matched stem cells', 'Correct.'],
          ['Vaccines only', 'Not its aim.'],
          ['New species', 'Not its aim.'],
        ],
        1,
        'Matched stem cells avoid immune rejection.',
        'medium',
      ),
      mcq(
        'In gene cloning, each bacterial colony carrying the plasmid is…',
        [
          ['A mutant', 'Not necessarily.'],
          ['A clone', 'Correct.'],
          ['A virus', 'Bacteria are not viruses.'],
          ['A gamete', 'Bacteria do not form gametes.'],
        ],
        1,
        'A colony arises from one cell, so all cells are identical copies.',
      ),
    ],
  },

  biotechApps: {
    curiosity:
      'Over 90% of cotton grown in India is genetically modified to kill the bollworm pest, and farmers spray far less insecticide on it. How does a plant make its own pesticide?',
    curiosityQuestion: hook(
      'How does Bt cotton protect itself from bollworms?',
      [
        'It carries a bacterial gene that makes a protein toxic to the insect',
        'It is sprayed with Bt chemical every day',
        'Its leaves are too hard to eat',
      ],
      0,
      'The cry gene from Bacillus thuringiensis makes a Cry protein that kills bollworm larvae.',
    ),
    easy: '**Biotechnology** uses living organisms or their parts to make useful products. It is grouped by colour:\n\n- **Red (medicine):** recombinant **insulin**, growth hormone, **vaccines** (hepatitis B, mRNA), **monoclonal antibodies**, gene therapy, PCR diagnosis.\n- **Green (agriculture):** **Bt cotton** and Bt brinjal (pest resistant), **Golden Rice** (vitamin A), herbicide-tolerant crops, tissue-culture plants, biofertilisers.\n- **White (industry):** **enzymes**, **bioethanol**, biodegradable plastics (PLA), antibiotics, citric acid.\n- **Blue (marine)** and **grey (environment):** bioremediation, wastewater treatment.\n\nA **GMO (genetically modified organism)** has a gene added or changed by genetic engineering. Animals with a foreign gene are **transgenic**.',
    tenMark:
      '## Introduction\nBiotechnology is the use of living organisms, cells or biomolecules to develop products and processes for human benefit. Modern biotechnology combines genetic engineering, cell culture and bioprocess engineering.\n\n## Applications in medicine (red biotechnology)\n1. **Recombinant proteins:** insulin (Humulin), human growth hormone, erythropoietin, interferons.\n2. **Vaccines:** recombinant hepatitis B; mRNA and viral-vector COVID-19 vaccines.\n3. **Monoclonal antibodies:** cancer therapy (trastuzumab), pregnancy and COVID test kits.\n4. **Gene therapy:** correcting faulty genes (first case: ADA deficiency, 1990).\n5. **Diagnostics:** PCR, ELISA, DNA probes.\n6. **Stem-cell therapy and regenerative medicine.**\n\n## Applications in agriculture (green biotechnology)\n1. **Bt crops:** cry genes from *Bacillus thuringiensis* make insecticidal proteins (Bt cotton, approved in India 2002).\n2. **Golden Rice:** β-carotene genes to fight vitamin A deficiency.\n3. **Herbicide-tolerant and drought-tolerant crops.**\n4. **RNA interference:** nematode-resistant tobacco.\n5. **Micropropagation:** disease-free plantlets.\n6. **Biofertilisers and biopesticides:** Rhizobium, Azotobacter, Trichoderma.\n\n## Applications in industry (white biotechnology)\n1. **Enzymes** for detergents, textiles, food.\n2. **Biofuels:** bioethanol, biodiesel, biogas.\n3. **Bioplastics:** PLA, PHB.\n4. **Fermentation products:** antibiotics (penicillin), citric acid, vitamins, amino acids.\n5. **Bioleaching:** bacteria extract copper and gold from low-grade ores.\n\n## Summary table\n| Sector | Product | Organism / tool |\n|---|---|---|\n| Medicine | Insulin | Recombinant E. coli |\n| Agriculture | Bt cotton | cry gene from B. thuringiensis |\n| Industry | Bioethanol | Yeast fermentation |\n\n## Concerns\nBiosafety, gene flow to wild plants, allergenicity, cost and access. In India the **GEAC** (Genetic Engineering Appraisal Committee) regulates GMOs.\n\n## Conclusion\nBiotechnology is a multi-billion-dollar engineering industry that touches health, food and energy.',
    realWorld:
      '- **Bt cotton** covers over 90% of India’s cotton area.\n- **Covaxin and Covishield** were mass-produced by Indian biotech firms during COVID-19.\n- **Biocon’s** recombinant insulin and biosimilars are exported worldwide.\n- **AI-driven drug discovery** combines biotech data with machine learning to find new medicines faster.',
    flashcards: [
      ['Bt cotton gene source?', 'Bacillus thuringiensis (cry genes).'],
      ['Golden Rice is enriched with?', 'β-carotene (provitamin A).'],
      ['Red, green and white biotechnology?', 'Medicine, agriculture, industry.'],
      ['Who regulates GMOs in India?', 'GEAC (Genetic Engineering Appraisal Committee).'],
      [
        'Transgenic organism?',
        'An organism carrying a foreign gene inserted by genetic engineering.',
      ],
    ],
    mcqs: [
      mcq(
        'Bt cotton is resistant to…',
        [
          ['Drought', 'That is a different trait.'],
          ['Bollworms', 'Correct.'],
          ['Viruses', 'Not what Bt targets.'],
          ['Herbicides', 'That is a different trait.'],
        ],
        1,
        'Cry proteins kill bollworm larvae.',
      ),
      mcq(
        'Golden Rice helps fight deficiency of…',
        [
          ['Vitamin C', 'Not the target.'],
          ['Vitamin A', 'Correct.'],
          ['Iron only', 'Not the main target.'],
          ['Iodine', 'Not the target.'],
        ],
        1,
        'It contains β-carotene, which the body converts to vitamin A.',
      ),
      mcq(
        'Which is an example of white (industrial) biotechnology?',
        [
          ['Gene therapy', 'That is red biotechnology.'],
          ['Bt brinjal', 'That is green biotechnology.'],
          ['Bioethanol production', 'Correct.'],
          ['Monoclonal antibodies', 'Those are red biotechnology.'],
        ],
        2,
        'Industrial fermentation for fuel is white biotechnology.',
        'medium',
      ),
      mcq(
        'The first recombinant drug approved for human use was…',
        [
          ['Penicillin', 'Penicillin is a natural antibiotic.'],
          ['Human insulin', 'Correct.'],
          ['Aspirin', 'Aspirin is synthetic chemistry.'],
          ['Paracetamol', 'Synthetic chemistry.'],
        ],
        1,
        'Humulin was approved in 1982.',
        'medium',
      ),
      mcq(
        'Bacteria extracting metals from low-grade ores is called…',
        [
          ['Bioleaching', 'Correct.'],
          ['Biofortification', 'That adds nutrients to crops.'],
          ['Biopiracy', 'That is unfair use of biological resources.'],
          ['Biomagnification', 'That is build-up of toxins in a food chain.'],
        ],
        0,
        'Acidithiobacillus oxidises sulphide ores, releasing copper.',
        'hard',
      ),
    ],
  },
};
