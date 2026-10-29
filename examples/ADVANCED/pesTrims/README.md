# PES Trims (sew-out test)

Checks how a PES file carries travel, trims and colours to the machine:

- **Row 1**: four squares with `trimThread()` after each. PES writes a trim as a jump with the trim
  flag; a machine with an automatic thread cutter should cut between the squares.
- **Row 2**: the same squares without `trimThread()`: the travel is sewn (reference).
- **Row 3**: four circles 20 mm apart; `ellipse()` inserts a jump when the gap exceeds
  `jumpThreshold` (10 mm), written with the trim flag as well.
- **Frame**: a second colour, so the file has one colour change and one thumbnail per colour.

Export PES and DST and load both on the machine. Check:

1. The thumbnail shows the design (rows and frame), not an empty frame.
2. The design sits centred in the hoop and within its boundary.
3. Which travels are cut: row 1 and row 3 in the PES file; compare with the DST file.
