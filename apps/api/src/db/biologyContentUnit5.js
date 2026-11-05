/**
 * Biology for Computer Engineers (BOT26105), Unit V: Bioengineering and Biomedical Applications.
 * Faculty-authored demo content, seeded as published. No videos yet: faculty add them in the studio.
 */
import { hook, mcq } from './biologyContentHelpers.js';

export const BIOLOGY_UNIT5 = {
  bioengineering: {
    curiosity:
      'A cochlear implant lets a deaf child hear by turning sound into electrical pulses that the nerve understands. Is this electronics, or biology?',
    curiosityQuestion: hook(
      'What is bioengineering?',
      [
        'Applying engineering principles to biology and medicine',
        'Building computers from wood',
        'Growing plants in space only',
      ],
      0,
      'Bioengineering combines engineering design with life sciences to solve biological and medical problems.',
    ),
    easy: '**Bioengineering (biological engineering)** applies the principles of engineering — design, analysis, modelling and control — to **living systems**.\n\nIt works in two directions:\n- **Engineering for biology:** building tools for medicine and biology (implants, imaging, sensors, prosthetics).\n- **Biology for engineering:** using cells, enzymes and DNA as parts of technology (biofuels, biosensors, DNA storage, biomimicry).\n\nMain branches:\n- **Biomedical engineering** — devices, implants, imaging.\n- **Tissue engineering** — growing replacement tissue.\n- **Biomechanics** — forces in the body (joints, blood flow).\n- **Bioinstrumentation** — sensors and electronics for biological signals.\n- **Biomaterials** — materials safe inside the body (titanium, hydrogels).\n- **Synthetic biology** — designing new genetic “circuits”.\n- **Computational biology and bioinformatics**.\n\nFor computer engineers: **brain–computer interfaces, medical imaging AI, wearable sensors and genomic data** are all bioengineering.',
    tenMark:
      '## Introduction\nBioengineering is an interdisciplinary field that applies the principles and methods of engineering, physical sciences and computing to solve problems in biology and medicine. It also uses biological systems to create new technology.\n\n## Scope and branches\n| Branch | Focus | Examples |\n|---|---|---|\n| Biomedical engineering | Healthcare devices | Pacemaker, MRI, dialysis |\n| Biomechanics | Mechanics of the body | Joint replacement, gait analysis |\n| Biomaterials | Materials compatible with tissue | Titanium implants, hydrogels |\n| Bioinstrumentation | Sensing and measuring biosignals | ECG, EEG, pulse oximeter |\n| Tissue engineering | Regenerating tissue | Skin grafts, bioprinting |\n| Genetic / synthetic biology | Engineering genes and cells | CRISPR, genetic circuits |\n| Bioprocess engineering | Scaling biological production | Fermenters, vaccine plants |\n| Computational biology | Modelling and data | Genome analysis, protein folding |\n| Neural engineering | Nervous system interfaces | Brain–computer interfaces, cochlear implants |\n\n## Engineering principles applied\n1. **Design:** specify requirements, prototype, test (e.g. a stent).\n2. **Modelling and simulation:** blood flow (CFD), drug kinetics, cell signalling networks.\n3. **Control systems:** artificial pancreas (insulin pump with glucose feedback).\n4. **Signal processing:** filtering ECG and EEG.\n5. **Materials science:** biocompatibility, strength, degradation.\n\n## Biology for engineering\n- **Biomimicry:** Velcro (burrs), bullet-train nose (kingfisher beak).\n- **Neural networks** inspired by neurons.\n- **DNA data storage and DNA computing.**\n- **Biofuels and bio-based materials.**\n\n## Biocompatibility\nAny material or device in the body must not cause toxicity, inflammation or rejection, and must work reliably for its lifetime.\n\n## Conclusion\nBioengineering is where engineering meets life; computer engineers contribute through signal processing, AI, embedded systems and data analysis.',
    realWorld:
      '- **Cochlear implants** convert sound to electrical pulses for the auditory nerve.\n- **Neuralink and other brain–computer interfaces** let paralysed patients move a cursor by thought.\n- **The artificial pancreas** is a closed-loop control system: glucose sensor + algorithm + insulin pump.\n- **Biomimicry:** Japan’s Shinkansen bullet-train nose was redesigned after the kingfisher’s beak to cut noise.',
    flashcards: [
      [
        'Bioengineering?',
        'Applying engineering principles to biology and medicine, and using biology in technology.',
      ],
      [
        'Biocompatibility?',
        'The ability of a material to work in the body without harmful reactions.',
      ],
      [
        'Example of biomimicry?',
        'Velcro (from burrs) or the bullet-train nose (from the kingfisher beak).',
      ],
      [
        'Bioinstrumentation?',
        'Sensors and electronics for measuring biological signals (ECG, EEG).',
      ],
      [
        'Artificial pancreas?',
        'Closed-loop system: glucose sensor + control algorithm + insulin pump.',
      ],
    ],
    mcqs: [
      mcq(
        'Which branch deals with forces and motion in the body?',
        [
          ['Biomechanics', 'Correct.'],
          ['Bioinformatics', 'That deals with biological data.'],
          ['Microbiology', 'That studies microbes.'],
          ['Genetics', 'That studies heredity.'],
        ],
        0,
        'Biomechanics analyses joints, muscles and blood flow.',
      ),
      mcq(
        'A material that does not cause harmful reactions in the body is…',
        [
          ['Biodegradable', 'Biodegradable means it breaks down.'],
          ['Biocompatible', 'Correct.'],
          ['Bioluminescent', 'That means it emits light.'],
          ['Biohazardous', 'The opposite.'],
        ],
        1,
        'Biocompatibility is essential for implants.',
      ),
      mcq(
        'A cochlear implant is an example of…',
        [
          ['Neural engineering', 'Correct.'],
          ['Fermentation', 'Unrelated.'],
          ['Phytoremediation', 'Unrelated.'],
          ['Cloning', 'Unrelated.'],
        ],
        0,
        'It interfaces electronics with the auditory nerve.',
        'medium',
      ),
      mcq(
        'Velcro was inspired by…',
        [
          ['Lotus leaves', 'Lotus leaves inspired self-cleaning surfaces.'],
          ['Burrs sticking to fur', 'Correct.'],
          ['Spider silk', 'Spider silk inspired strong fibres.'],
          ['Shark skin', 'Shark skin inspired low-drag swimsuits.'],
        ],
        1,
        'George de Mestral noticed burr hooks clinging to his dog’s fur.',
      ),
      mcq(
        'An artificial pancreas is mainly an application of…',
        [
          ['Closed-loop control systems', 'Correct.'],
          ['Open-pit mining', 'Unrelated.'],
          ['Cloning', 'Unrelated.'],
          ['Composting', 'Unrelated.'],
        ],
        0,
        'Sensor readings feed an algorithm that controls insulin delivery.',
        'medium',
      ),
    ],
  },

  tissueEngineering: {
    curiosity:
      'Over 2 lakh people in India need a new kidney every year, but only a few thousand transplants happen. What if we could print a kidney on a 3-D printer instead of waiting for a donor?',
    curiosityQuestion: hook(
      'What are the three key ingredients of tissue engineering?',
      [
        'Cells, a scaffold and growth signals',
        'Plastic, glue and paint',
        'Metal, wires and batteries',
      ],
      0,
      'Cells grow on a scaffold guided by growth factors or physical signals to form new tissue.',
    ),
    easy: '**Tissue engineering** grows new tissue to repair or replace damaged parts of the body. It combines three things (the **tissue engineering triad**):\n\n1. **Cells** — often the patient’s own cells or stem cells.\n2. **Scaffold** — a 3-D support, often **biodegradable** (collagen, PLA, hydrogels), on which cells grow.\n3. **Signals** — **growth factors** and mechanical/electrical cues that tell cells what to become.\n\nCells are grown in a **bioreactor**, then implanted. Successes: **artificial skin** for burns, cartilage, bladders, blood vessels, corneas.\n\n**3-D bioprinting** prints layers of “bio-ink” (cells + gel) to build tissue shapes.\n\n**Artificial organs** are engineered devices that do an organ’s job:\n- **Artificial kidney** — dialysis machine.\n- **Artificial heart / LVAD** — mechanical pump.\n- **Heart–lung machine** — during surgery.\n- **Cochlear implant**, **artificial pancreas**, **bionic limbs**.',
    tenMark:
      '## Introduction\nTissue engineering, defined by Langer and Vacanti (1993), applies engineering and life sciences to develop biological substitutes that restore, maintain or improve tissue function. Artificial organs are devices that replace organ function.\n\n## The tissue engineering triad\n1. **Cells:** autologous (patient’s own, no rejection), allogeneic (donor), stem cells (embryonic, adult, iPSCs).\n2. **Scaffold:** a 3-D porous structure that supports cell attachment and growth, then degrades as new tissue forms.\n   - Natural: collagen, chitosan, alginate, decellularised organs.\n   - Synthetic: PLA, PGA, PLGA, hydrogels.\n   - Requirements: biocompatible, biodegradable, porous (for nutrients), mechanically suitable.\n3. **Signals:** growth factors (VEGF for blood vessels, BMP for bone), mechanical stimulation, electrical cues.\n\n## Process\nHarvest cells → expand in culture → seed onto scaffold → mature in a bioreactor → implant → scaffold degrades and native tissue forms.\n\n## 3-D bioprinting\nComputer-aided design (from CT/MRI scans) guides a printer that deposits bio-ink layer by layer (extrusion, inkjet or laser-assisted). Used for skin, cartilage, and research models of liver and heart.\n\n## Applications\nSkin substitutes for burns, cartilage repair, bone grafts, tissue-engineered blood vessels, bladders, tracheas, corneas.\n\n## Artificial organs\n| Organ | Artificial substitute | Principle |\n|---|---|---|\n| Kidney | Haemodialysis machine | Diffusion across semi-permeable membrane |\n| Heart | Total artificial heart, LVAD | Mechanical pump |\n| Heart + lungs | Heart–lung machine (cardiopulmonary bypass) | Pump + oxygenator |\n| Pancreas | Insulin pump + CGM | Closed-loop control |\n| Ear | Cochlear implant | Electrical nerve stimulation |\n| Limbs | Myoelectric prostheses | EMG signals control motors |\n| Eye | Retinal implant | Electrode array stimulates retina |\n\n## Challenges\nVascularisation of thick tissues, immune rejection, cost, long-term durability, regulatory approval.\n\n## Conclusion\nTissue engineering and artificial organs aim to end the shortage of donor organs; they depend on cell biology, materials science and computer-controlled manufacturing.',
    realWorld:
      '- **Jaipur Foot**, an Indian low-cost prosthetic, has helped over a million amputees.\n- **Pandorum Technologies** (Bengaluru) is bioprinting corneal tissue.\n- **Haemodialysis** is a daily lifeline for kidney patients across India.\n- **3-D bioprinters** are controlled by CAD software and G-code, just like ordinary 3-D printers.',
    flashcards: [
      ['Tissue engineering triad?', 'Cells, scaffold, signals (growth factors).'],
      [
        'Ideal scaffold properties?',
        'Biocompatible, biodegradable, porous, mechanically suitable.',
      ],
      ['3-D bioprinting?', 'Printing layers of bio-ink (cells + gel) to build tissue.'],
      [
        'Artificial kidney?',
        'Haemodialysis machine: filters blood through a semi-permeable membrane.',
      ],
      ['Autologous cells?', 'Cells taken from the patient themselves; no immune rejection.'],
    ],
    mcqs: [
      mcq(
        'The supporting framework on which cells grow in tissue engineering is the…',
        [
          ['Scaffold', 'Correct.'],
          ['Plasmid', 'A plasmid is a DNA vector.'],
          ['Capsid', 'A capsid is a viral coat.'],
          ['Primer', 'A primer is used in PCR.'],
        ],
        0,
        'Scaffolds give cells a 3-D structure to grow on.',
      ),
      mcq(
        'A dialysis machine works on the principle of…',
        [
          ['Diffusion across a semi-permeable membrane', 'Correct.'],
          ['Combustion', 'Unrelated.'],
          ['Fermentation', 'Unrelated.'],
          ['Photosynthesis', 'Unrelated.'],
        ],
        0,
        'Wastes diffuse from blood into dialysis fluid.',
      ),
      mcq(
        'Using a patient’s own cells avoids…',
        [
          ['Cell division', 'Cells still divide.'],
          ['Immune rejection', 'Correct.'],
          ['Need for scaffolds', 'Scaffolds are still needed.'],
          ['Growth factors', 'Signals are still needed.'],
        ],
        1,
        'Autologous cells are recognised as “self”.',
        'medium',
      ),
      mcq(
        'A myoelectric prosthetic hand is controlled by…',
        [
          ['EMG signals from muscles', 'Correct.'],
          ['Sunlight', 'Unrelated.'],
          ['Sound waves', 'Unrelated.'],
          ['Heart rate', 'Not the control signal.'],
        ],
        0,
        'Electrodes read muscle electrical activity to drive motors.',
        'medium',
      ),
      mcq(
        'A major challenge in engineering thick organs is…',
        [
          ['Vascularisation (supplying blood vessels)', 'Correct.'],
          ['Too many blood vessels', 'The opposite problem.'],
          ['Cells growing too slowly to ever divide', 'Cells do divide.'],
          ['Lack of computers', 'Not the main challenge.'],
        ],
        0,
        'Cells deep inside need blood vessels for oxygen and nutrients.',
        'hard',
      ),
    ],
  },

  biosensors: {
    curiosity:
      'A diabetic pricks a finger, places a drop of blood on a strip, and a small meter shows the sugar level in 5 seconds. How does a chemical in blood become a number on a screen?',
    curiosityQuestion: hook(
      'In a glucometer, what produces the electrical signal from glucose?',
      [
        'The enzyme glucose oxidase reacting with glucose on the strip',
        'The battery heating the blood',
        'A camera photographing the blood',
      ],
      0,
      'Glucose oxidase oxidises glucose; the electrons released create a current proportional to glucose concentration.',
    ),
    easy: 'A **biosensor** is a device that uses a **biological element** to detect a substance and converts it into a measurable **signal**.\n\nThree parts:\n\n1. **Bio-recognition element (bioreceptor)** — enzyme, antibody, DNA, whole cell. It binds the target (**analyte**) very specifically.\n2. **Transducer** — turns the biological reaction into an electrical, optical, thermal or mass signal.\n3. **Signal processor and display** — amplifies and shows the reading.\n\n**Example — glucometer:** glucose oxidase on the strip oxidises glucose → electrons flow → current ∝ glucose → meter shows mg/dL.\n\n**Types by transducer:** electrochemical (glucometer), optical (pregnancy test strip colour), piezoelectric (mass change), thermal.\n\nOther examples: **pregnancy test kits**, **COVID-19 rapid antigen tests**, **smartwatch heart-rate and SpO₂ sensors**, food-toxin detectors.\n\nThe first biosensor was the **Clark oxygen electrode** (Leland Clark, father of biosensors, 1962).',
    tenMark:
      '## Introduction\nA biosensor is an analytical device that combines a biological sensing element with a physicochemical transducer to produce a signal proportional to the concentration of a target analyte. Leland C. Clark developed the first enzyme electrode (1962) and is called the father of biosensors.\n\n## Components\n1. **Analyte:** substance to be detected (glucose, urea, antigen).\n2. **Bioreceptor:** enzymes, antibodies, nucleic acids, cells, aptamers — gives specificity.\n3. **Transducer:** converts the bio-recognition event into a measurable signal.\n4. **Electronics:** amplifier, signal processing, ADC.\n5. **Display:** shows result.\n\nAnalyte → Bioreceptor → Transducer → Amplifier → Processor → Display.\n\n## Classification\n### By bioreceptor\nEnzyme biosensors, immunosensors (antibody), DNA biosensors, whole-cell biosensors.\n### By transducer\n| Type | Signal | Example |\n|---|---|---|\n| Electrochemical (amperometric, potentiometric) | Current / voltage | Glucometer |\n| Optical | Colour, fluorescence, SPR | Pregnancy test, lateral-flow COVID kit |\n| Piezoelectric | Frequency change with mass | Quartz-crystal microbalance |\n| Thermal (calorimetric) | Heat of reaction | Enzyme thermistor |\n\n## Working of a glucose biosensor\nGlucose + O₂ —(glucose oxidase)→ gluconic acid + H₂O₂.\nH₂O₂ is oxidised at the electrode, releasing electrons; the current is proportional to glucose concentration. Modern strips use mediators (ferrocene) for accuracy.\n\n## Characteristics of a good biosensor\nSelectivity, sensitivity, fast response, reproducibility, stability, low cost, small size.\n\n## Applications\n- **Healthcare:** glucose, cholesterol, cardiac markers, pregnancy, infectious-disease tests, continuous glucose monitors.\n- **Wearables:** heart rate, SpO₂, sweat analysis.\n- **Environment:** pesticides, heavy metals, BOD.\n- **Food and agriculture:** toxins, pathogens, freshness.\n- **Defence:** biological warfare agents.\n\n## Conclusion\nBiosensors are where biology meets electronics; microcontrollers, signal processing and wireless links turn them into smart IoT health devices.',
    realWorld:
      '- **Glucometers** and **continuous glucose monitors** (CGMs) help millions of Indian diabetics.\n- **Lateral-flow test kits** (pregnancy, COVID-19 antigen) are optical biosensors.\n- **Smartwatches** use optical sensors (PPG) for heart rate and SpO₂.\n- **IIT and startup research** builds low-cost paper biosensors read by smartphone cameras.',
    flashcards: [
      ['Three main parts of a biosensor?', 'Bioreceptor, transducer, signal processor/display.'],
      ['Enzyme in glucose biosensors?', 'Glucose oxidase.'],
      ['Father of biosensors?', 'Leland C. Clark (oxygen electrode, 1962).'],
      ['Transducer role?', 'Converts the biological reaction into a measurable signal.'],
      [
        'Example of an optical biosensor?',
        'Pregnancy test strip or lateral-flow COVID-19 antigen test.',
      ],
    ],
    mcqs: [
      mcq(
        'The component that gives a biosensor its specificity is the…',
        [
          ['Display', 'The display only shows results.'],
          ['Bioreceptor', 'Correct.'],
          ['Battery', 'The battery supplies power.'],
          ['Amplifier', 'The amplifier boosts the signal.'],
        ],
        1,
        'Enzymes or antibodies bind only the target analyte.',
      ),
      mcq(
        'A glucometer is an example of which type of biosensor?',
        [
          ['Electrochemical', 'Correct.'],
          ['Piezoelectric', 'Measures mass changes.'],
          ['Thermal', 'Measures heat.'],
          ['Acoustic', 'Not the glucometer principle.'],
        ],
        0,
        'It measures current from glucose oxidation.',
      ),
      mcq(
        'Glucose oxidase converts glucose into gluconic acid and…',
        [
          ['Ethanol', 'That is yeast fermentation.'],
          ['Hydrogen peroxide', 'Correct.'],
          ['Methane', 'That is biogas.'],
          ['Starch', 'Starch is a polymer of glucose.'],
        ],
        1,
        'H₂O₂ is then oxidised at the electrode to produce current.',
        'medium',
      ),
      mcq(
        'An immunosensor uses which bioreceptor?',
        [
          ['Enzyme', 'That is an enzyme sensor.'],
          ['Antibody', 'Correct.'],
          ['Whole cell', 'That is a cell-based sensor.'],
          ['Lipid', 'Not a typical bioreceptor.'],
        ],
        1,
        'Antibodies bind specific antigens.',
        'medium',
      ),
      mcq(
        'A piezoelectric biosensor detects…',
        [
          ['Change in mass on a crystal surface', 'Correct.'],
          ['Change in colour', 'That is optical.'],
          ['Change in temperature', 'That is thermal.'],
          ['Change in current from redox', 'That is electrochemical.'],
        ],
        0,
        'Binding adds mass, which shifts the crystal’s vibration frequency.',
        'hard',
      ),
    ],
  },

  biomedicalDevices: {
    curiosity:
      'A pacemaker the size of a coin can keep a heart beating for 10 years on one battery. It is really a tiny embedded computer. What does it actually do?',
    curiosityQuestion: hook(
      'What does a cardiac pacemaker do?',
      [
        'Senses the heart rhythm and sends electrical pulses when the heart beats too slowly',
        'Pumps blood instead of the heart',
        'Cleans the blood of toxins',
      ],
      0,
      'It is a sense-and-stimulate embedded system that keeps the heart rate above a set minimum.',
    ),
    easy: '**Biomedical devices** are instruments, implants and machines used to **diagnose, monitor or treat** disease. **Healthcare engineering** applies engineering to improve medical care.\n\n**Diagnostic devices**\n- **ECG** — records the heart’s electrical activity (P, QRS, T waves).\n- **EEG** — brain waves; **EMG** — muscle signals.\n- **Imaging:** X-ray, **CT** (computer-built cross-sections), **MRI** (magnets and radio waves), **ultrasound**, PET.\n- **Pulse oximeter** — SpO₂ using red and infrared light.\n\n**Therapeutic devices**\n- **Pacemaker** and **defibrillator** (heart rhythm), **ventilator** (breathing), **dialysis machine**, **insulin pump**, **laser surgery**, **surgical robots**.\n\n**Assistive and implantable devices** — hearing aids, cochlear implants, prosthetic limbs, stents, artificial joints.\n\nComputer engineering is everywhere: **embedded systems**, **signal processing**, **medical imaging software**, **AI diagnosis**, **telemedicine** and electronic health records.',
    tenMark:
      '## Introduction\nA biomedical device is any instrument, apparatus, implant or software intended for diagnosis, prevention, monitoring or treatment of disease. Healthcare engineering applies engineering and computing to improve the delivery and quality of healthcare. In India, devices are regulated by CDSCO under the Medical Devices Rules, 2017.\n\n## Classification\n### 1. Diagnostic devices\n| Device | Principle | Use |\n|---|---|---|\n| ECG | Records electrical activity of the heart via skin electrodes | Arrhythmia, heart attack |\n| EEG | Brain electrical activity | Epilepsy, sleep studies |\n| X-ray / CT | X-ray attenuation; CT reconstructs slices by computer | Fractures, tumours |\n| MRI | Hydrogen nuclei in a strong magnetic field emit RF signals | Soft tissue, brain |\n| Ultrasound | Echoes of high-frequency sound | Pregnancy, organs |\n| Pulse oximeter | Absorption of red and IR light by haemoglobin | Blood oxygen (SpO₂) |\n\n### 2. Therapeutic devices\nPacemaker (electrical stimulation), defibrillator (shock to restore rhythm), ventilator, dialysis machine, infusion and insulin pumps, lithotripter (shock waves break kidney stones), radiotherapy machines, surgical robots (da Vinci).\n\n### 3. Implantable and assistive devices\nStents, artificial joints, heart valves, cochlear implants, intraocular lenses, prosthetic limbs, hearing aids.\n\n### 4. Monitoring and digital health\nPatient monitors, wearables, continuous glucose monitors, telemedicine platforms, electronic health records, AI diagnostic software.\n\n## Example: the cardiac pacemaker\nComponents: lithium battery, pulse generator (microcontroller), leads with electrodes. It senses intrinsic heartbeats and paces only when the rate falls below a set value (demand pacing).\n\n## Applications of biology in healthcare engineering\n- Understanding physiology to design devices (heart’s conduction system → pacemaker).\n- Biomaterials for implants.\n- Biosensors for diagnosis.\n- Genomics for personalised medicine.\n- AI trained on medical images and biosignals.\n\n## Safety requirements\nBiocompatibility, electrical safety, reliability, sterilisation, data privacy and regulatory approval.\n\n## Conclusion\nModern healthcare runs on engineering: almost every biomedical device is an embedded, software-driven system, offering wide scope to computer engineers.',
    realWorld:
      '- **AI tools** read chest X-rays for TB screening in Indian public health programmes (e.g. Qure.ai).\n- **eSanjeevani**, India’s national telemedicine service, has handled crores of consultations.\n- **Low-cost ventilators** were designed by Indian engineering startups during COVID-19.\n- **Wearable ECG** in smartwatches detects atrial fibrillation.',
    flashcards: [
      ['ECG records?', 'Electrical activity of the heart (P wave, QRS complex, T wave).'],
      ['MRI uses?', 'A strong magnetic field and radio waves (no ionising radiation).'],
      [
        'Pacemaker?',
        'Implanted device that sends electrical pulses when the heart beats too slowly.',
      ],
      [
        'Pulse oximeter principle?',
        'Different absorption of red and infrared light by oxygenated and deoxygenated haemoglobin.',
      ],
      ['Medical device regulator in India?', 'CDSCO (Medical Devices Rules, 2017).'],
    ],
    mcqs: [
      mcq(
        'Which imaging method uses no ionising radiation?',
        [
          ['X-ray', 'X-rays are ionising.'],
          ['CT', 'CT uses X-rays.'],
          ['MRI', 'Correct.'],
          ['PET', 'PET uses radioactive tracers.'],
        ],
        2,
        'MRI uses magnetic fields and radio waves.',
      ),
      mcq(
        'The QRS complex in an ECG represents…',
        [
          ['Atrial depolarisation', 'That is the P wave.'],
          ['Ventricular depolarisation', 'Correct.'],
          ['Ventricular repolarisation', 'That is the T wave.'],
          ['Breathing', 'Unrelated.'],
        ],
        1,
        'The QRS complex marks the ventricles contracting.',
        'hard',
      ),
      mcq(
        'A pulse oximeter measures…',
        [
          ['Blood glucose', 'A glucometer does that.'],
          ['Blood oxygen saturation', 'Correct.'],
          ['Blood pressure', 'A sphygmomanometer does that.'],
          ['Body temperature', 'A thermometer does that.'],
        ],
        1,
        'It compares red and infrared light absorption.',
      ),
      mcq(
        'Ultrasound imaging is based on…',
        [
          ['Echoes of high-frequency sound', 'Correct.'],
          ['X-ray absorption', 'That is radiography.'],
          ['Magnetic resonance', 'That is MRI.'],
          ['Radioactive decay', 'That is nuclear imaging.'],
        ],
        0,
        'Sound reflects at tissue boundaries; echoes form the image.',
      ),
      mcq(
        'A defibrillator is used to…',
        [
          ['Restore normal heart rhythm with an electric shock', 'Correct.'],
          ['Measure brain waves', 'That is EEG.'],
          ['Break kidney stones', 'That is a lithotripter.'],
          ['Filter blood', 'That is dialysis.'],
        ],
        0,
        'It stops fibrillation so the heart’s natural pacemaker can reset.',
        'medium',
      ),
    ],
  },

  bioinformatics: {
    curiosity:
      'The human genome has about 3 billion DNA letters — roughly 750 MB of data per person. Finding one disease-causing typo by hand would take lifetimes. Who does this work?',
    curiosityQuestion: hook(
      'What is bioinformatics?',
      [
        'Using computers and algorithms to store and analyse biological data',
        'Studying the biology of computer chips',
        'Repairing computers with enzymes',
      ],
      0,
      'Bioinformatics combines biology, computer science and statistics to make sense of sequences and structures.',
    ),
    easy: '**Bioinformatics** uses **computers, algorithms and databases** to store, search and analyse **biological data** — DNA, RNA and protein sequences and structures.\n\nWhy it is needed: sequencing machines produce **terabytes** of data; only software can make sense of it.\n\n**Databases**\n- **GenBank** (NCBI, USA), **ENA** (Europe), **DDBJ** (Japan) — nucleotide sequences.\n- **UniProt** — protein sequences. **PDB** — 3-D protein structures.\n\n**Tools**\n- **BLAST** — finds similar sequences (like a search engine for DNA).\n- **Sequence alignment** — Needleman–Wunsch (global) and Smith–Waterman (local), both **dynamic programming** algorithms.\n- **Phylogenetic trees** — evolutionary relationships.\n- **Structure prediction** — AlphaFold.\n\n**Uses:** finding disease genes, drug design, vaccine design, tracking virus variants, personalised medicine.\n\nSkills used: **Python, R, algorithms, databases, machine learning** — core computer-engineering skills.',
    tenMark:
      '## Introduction\nBioinformatics is an interdisciplinary field that develops and applies computational methods to acquire, store, organise, analyse and visualise biological data. The term was used by Paulien Hogeweg (1970). It grew rapidly with the Human Genome Project (1990–2003).\n\n## Need for bioinformatics\nHigh-throughput sequencing generates massive data; manual analysis is impossible. Computing is needed for storage, search, comparison and prediction.\n\n## Biological databases\n| Type | Database | Content |\n|---|---|---|\n| Nucleotide | GenBank, ENA, DDBJ (INSDC) | DNA/RNA sequences |\n| Protein sequence | UniProt (Swiss-Prot, TrEMBL) | Protein sequences and function |\n| Structure | PDB | 3-D structures |\n| Literature | PubMed | Research articles |\n| Genome | Ensembl, UCSC | Annotated genomes |\n\nPrimary databases hold raw data; secondary databases hold derived information (motifs, domains).\n\n## Key tools and algorithms\n1. **Sequence alignment:** pairwise (Needleman–Wunsch global, Smith–Waterman local — dynamic programming); multiple alignment (Clustal Omega).\n2. **BLAST (Basic Local Alignment Search Tool):** fast heuristic search for similar sequences.\n3. **Gene prediction:** finding genes in genomic DNA (hidden Markov models).\n4. **Phylogenetics:** building evolutionary trees (neighbour joining, maximum likelihood).\n5. **Structure prediction:** homology modelling, AlphaFold (deep learning).\n6. **Molecular docking:** predicting drug–target binding.\n\n## Applications\n- **Genomics and medicine:** identifying disease mutations, personalised medicine, pharmacogenomics.\n- **Drug discovery:** computer-aided drug design, virtual screening.\n- **Vaccine design:** reverse vaccinology (epitope prediction).\n- **Epidemiology:** tracking SARS-CoV-2 variants through genome surveillance (INSACOG in India).\n- **Agriculture:** crop genome analysis for better varieties.\n- **Evolution and biodiversity:** DNA barcoding.\n\n## Computer science used\nAlgorithms (dynamic programming, string matching, graphs), databases, statistics, machine learning, high-performance and cloud computing, Python/R/Biopython.\n\n## Conclusion\nBioinformatics is where computer engineers contribute most directly to biology: every modern biological discovery depends on software and data.',
    realWorld:
      '- **INSACOG**, India’s genome-sequencing consortium, tracked COVID-19 variants with bioinformatics pipelines.\n- **AlphaFold** has predicted structures for over 200 million proteins, free to use.\n- **Genome India Project** stores and analyses data from 10,000 genomes.\n- **Biopython** lets you parse a DNA sequence or run BLAST in a few lines of Python.',
    flashcards: [
      ['Bioinformatics?', 'Using computers and algorithms to store and analyse biological data.'],
      ['BLAST?', 'Basic Local Alignment Search Tool: finds similar sequences in databases.'],
      ['Database for 3-D protein structures?', 'PDB (Protein Data Bank).'],
      ['Algorithmic technique behind Needleman–Wunsch and Smith–Waterman?', 'Dynamic programming.'],
      ['Three INSDC nucleotide databases?', 'GenBank, ENA, DDBJ.'],
    ],
    mcqs: [
      mcq(
        'BLAST is used to…',
        [
          ['Find similar sequences in a database', 'Correct.'],
          ['Cut DNA', 'Restriction enzymes cut DNA.'],
          ['Amplify DNA', 'PCR amplifies DNA.'],
          ['Stain cells', 'Unrelated.'],
        ],
        0,
        'BLAST compares a query sequence against database sequences.',
      ),
      mcq(
        'The Protein Data Bank (PDB) stores…',
        [
          ['DNA sequences only', 'GenBank stores those.'],
          ['3-D structures of biomolecules', 'Correct.'],
          ['Research articles', 'PubMed stores those.'],
          ['Patient records', 'Not a biological database.'],
        ],
        1,
        'PDB holds experimentally determined structures.',
      ),
      mcq(
        'Smith–Waterman performs…',
        [
          ['Global alignment', 'That is Needleman–Wunsch.'],
          ['Local alignment', 'Correct.'],
          ['DNA amplification', 'That is PCR.'],
          ['Protein synthesis', 'Unrelated.'],
        ],
        1,
        'It finds the best-matching local region using dynamic programming.',
        'medium',
      ),
      mcq(
        'GenBank is maintained by…',
        [
          ['NCBI (USA)', 'Correct.'],
          ['EMBL-EBI', 'EBI maintains ENA.'],
          ['DDBJ', 'DDBJ is the Japanese database.'],
          ['WHO', 'Not a sequence database.'],
        ],
        0,
        'The National Center for Biotechnology Information runs GenBank.',
        'medium',
      ),
      mcq(
        'Predicting protein 3-D structure from sequence with deep learning is done by…',
        [
          ['AlphaFold', 'Correct.'],
          ['BLAST', 'BLAST searches sequences.'],
          ['PCR', 'PCR amplifies DNA.'],
          ['Clustal', 'Clustal does multiple alignment.'],
        ],
        0,
        'DeepMind’s AlphaFold won the 2024 Nobel Prize in Chemistry (shared).',
      ),
    ],
  },

  bioethics: {
    curiosity:
      'A company offers to read your DNA for ₹10,000 and tell you your disease risks. Who else might see that data — your insurer, your employer, the police? Should scientists be allowed to edit the genes of babies?',
    curiosityQuestion: hook(
      'In 2018 a scientist edited the genes of twin babies with CRISPR. Why was this widely condemned?',
      [
        'It was done without proper safety evidence, oversight or valid consent, and the changes pass to future generations',
        'CRISPR does not work in humans',
        'Editing genes is always illegal in every form',
      ],
      0,
      'Germline editing is heritable and was done secretly with unknown risks; he was jailed in China.',
    ),
    easy: '**Bioethics** asks what we *should* do with biology and medicine, not just what we *can* do.\n\nFour core principles:\n1. **Autonomy** — respect people’s choices; get **informed consent**.\n2. **Beneficence** — do good.\n3. **Non-maleficence** — do no harm.\n4. **Justice** — fair access and fair sharing of benefits and risks.\n\nKey issues:\n- **Genetic privacy** — who can see your DNA data? Could it lead to discrimination?\n- **GM crops** — safety, effects on biodiversity, farmers’ dependence on seed companies.\n- **Cloning and germline gene editing** — designer babies, heritable changes.\n- **Stem-cell research** using embryos.\n- **Clinical trials** — consent and safety of participants, especially vulnerable groups.\n- **Biopiracy** — patenting traditional knowledge (e.g. India fought patents on **neem** and **turmeric**).\n- **AI in healthcare** — bias in algorithms, accountability for errors.\n- **Animal testing** — the **3Rs**: Replace, Reduce, Refine.\n\nIn India, the **ICMR** sets ethical guidelines, and every hospital study needs **Ethics Committee** approval.',
    tenMark:
      '## Introduction\nBioethics is the study of ethical issues arising from advances in biology, biotechnology and medicine. As biotechnology gives us power over life itself, engineers and scientists must consider the moral, legal and social implications (ELSI) of their work.\n\n## Principles of bioethics (Beauchamp and Childress)\n1. **Autonomy:** respect for individual decisions; informed, voluntary consent.\n2. **Beneficence:** act for the benefit of patients and society.\n3. **Non-maleficence:** “first, do no harm”.\n4. **Justice:** fair distribution of benefits, risks and costs.\nAlso: confidentiality, honesty, accountability.\n\n## Ethical issues in biotechnology\n1. **Genetically modified organisms:** food safety, allergenicity, gene flow to wild relatives, loss of biodiversity, corporate control of seeds. (India approved Bt cotton but put Bt brinjal on hold in 2010.)\n2. **Cloning:** human reproductive cloning is banned in most countries; animal welfare in cloning.\n3. **Gene editing:** somatic therapy is accepted with oversight; germline editing (He Jiankui, 2018) is heritable and widely prohibited.\n4. **Biopiracy and patents:** India successfully challenged patents on turmeric (1997) and neem; the **Biological Diversity Act (2002)** protects traditional knowledge.\n5. **Biosafety and biosecurity:** lab containment, dual-use research, bioweapons.\n\n## Ethical issues in biomedical engineering\n1. **Informed consent in clinical trials:** especially for vulnerable populations; ICMR National Ethical Guidelines (2017); Ethics Committees.\n2. **Genetic data privacy:** DNA reveals information about relatives too; risk of discrimination by insurers or employers; India’s **Digital Personal Data Protection Act (2023)**.\n3. **Organ transplantation:** fair allocation, organ trade (Transplantation of Human Organs Act, 1994).\n4. **Medical device safety:** failures, recalls, cybersecurity of connected implants.\n5. **AI in healthcare:** bias in training data, explainability, responsibility for errors.\n6. **Access and cost:** advanced therapies may be affordable only to the rich.\n7. **Animal experimentation:** 3Rs — Replacement, Reduction, Refinement.\n\n## Regulatory bodies in India\n| Body | Role |\n|---|---|\n| GEAC | Approves GMOs |\n| RCGM | Reviews genetic manipulation research |\n| ICMR | Ethical guidelines for biomedical research |\n| CDSCO | Approves drugs and medical devices |\n| National Biodiversity Authority | Prevents biopiracy |\n\n## Conclusion\nEthics is a design requirement, not an afterthought: technology that ignores consent, privacy and fairness loses public trust. Engineers building health and genetic systems carry this responsibility.',
    realWorld:
      '- **Genetic data apps** must follow India’s Digital Personal Data Protection Act, 2023 — a direct concern for software engineers.\n- **India won** the turmeric (1997) and neem patent challenges against biopiracy.\n- **AI diagnostic tools** must be tested for bias across skin tones, genders and regions.\n- **Pacemakers and insulin pumps** have had cybersecurity recalls: connected medical devices must be secure by design.',
    flashcards: [
      ['Four principles of bioethics?', 'Autonomy, beneficence, non-maleficence, justice.'],
      [
        'Informed consent?',
        'Voluntary agreement given after understanding the risks and benefits.',
      ],
      [
        'Biopiracy?',
        'Unauthorised commercial use or patenting of biological resources or traditional knowledge.',
      ],
      ['3Rs of animal research?', 'Replacement, Reduction, Refinement.'],
      [
        'Why is germline editing controversial?',
        'Changes are heritable, risks are unknown, and future generations cannot consent.',
      ],
    ],
    mcqs: [
      mcq(
        '“First, do no harm” is the principle of…',
        [
          ['Autonomy', 'Autonomy is about choice.'],
          ['Non-maleficence', 'Correct.'],
          ['Justice', 'Justice is about fairness.'],
          ['Beneficence', 'Beneficence is about doing good.'],
        ],
        1,
        'Non-maleficence means avoiding harm.',
      ),
      mcq(
        'Patenting the healing use of turmeric without crediting traditional knowledge is an example of…',
        [
          ['Bioremediation', 'Unrelated.'],
          ['Biopiracy', 'Correct.'],
          ['Biomimicry', 'Unrelated.'],
          ['Bioinformatics', 'Unrelated.'],
        ],
        1,
        'India challenged and revoked the US turmeric patent in 1997.',
      ),
      mcq(
        'Which body approves GM crops in India?',
        [
          ['ICMR', 'ICMR sets biomedical research ethics.'],
          ['GEAC', 'Correct.'],
          ['ISRO', 'Space agency.'],
          ['CPCB', 'Pollution control.'],
        ],
        1,
        'The Genetic Engineering Appraisal Committee (MoEFCC).',
        'medium',
      ),
      mcq(
        'Germline gene editing is especially controversial because…',
        [
          ['Changes are passed to future generations', 'Correct.'],
          ['It affects only one cell', 'It affects all cells of the person and descendants.'],
          ['It is cheap', 'Cost is not the main ethical issue.'],
          ['It cannot be detected', 'Not the main concern.'],
        ],
        0,
        'Future generations cannot consent to heritable changes.',
        'medium',
      ),
      mcq(
        'An AI diagnostic tool trained mostly on one population may…',
        [
          ['Work equally well for everyone', 'Not guaranteed.'],
          ['Show bias and perform worse for other groups', 'Correct.'],
          ['Never make errors', 'All tools make errors.'],
          ['Need no testing', 'Testing is essential.'],
        ],
        1,
        'Unrepresentative training data leads to biased results — an issue of justice.',
        'hard',
      ),
    ],
  },
};
