let showGrid = true;
let showHoopGuides = true; 
let showHoop = false;
let showCornerMarks = true;
let currentHoopPreset = "4x4";
let currentPaperSize = "A4";

let brandSelector;
let hoopSelector;
let paperSelector;

function setup() {
  // Create canvas sized to A4 paper at 72 DPI for web display
  const paper = getPaperSize(currentPaperSize);
  const mmToPixelsDisplay = 72 / 25.4; // 72 DPI for screen display
  const canvasWidth = paper.width * mmToPixelsDisplay;
  const canvasHeight = paper.height * mmToPixelsDisplay;
  
  createCanvas(canvasWidth, canvasHeight);
  
  // Set up p5.embroider pixel conversion for display
  // This tells p5.embroider how to convert mm to pixels for our display
  pixelsPerUnit = mmToPixelsDisplay;
  
  // UI Controls
  createP("Embroidery Guides Demo");
  
  createP("Display Options:");
  
  let gridButton = createButton("Toggle Grid");
  gridButton.mousePressed(() => {
    showGrid = !showGrid;
    redraw();
  });
  
  let hoopGuidesButton = createButton("Toggle Hoop Guides");
  hoopGuidesButton.mousePressed(() => {
    showHoopGuides = !showHoopGuides;
    redraw();
  });
  
  let hoopButton = createButton("Toggle Realistic Hoop");
  hoopButton.mousePressed(() => {
    showHoop = !showHoop;
    redraw();
  });
  
  let cornerMarksButton = createButton("Toggle Corner Marks");
  cornerMarksButton.mousePressed(() => {
    showCornerMarks = !showCornerMarks;
    redraw();
  });
  
  createP("Hoop Selection:");
  
  // Brand selector
  createSpan("Brand: ");
  brandSelector = createSelect();
  brandSelector.option("Manual (Hand Embroidery)", "manual");
  
  // Add all available brands dynamically
  const brands = getHoopBrands();
  brands.forEach(brand => {
    const brandLabel = brand.charAt(0).toUpperCase() + brand.slice(1) + " (Machine)";
    brandSelector.option(brandLabel, brand);
  });
  
  brandSelector.selected("manual");
  brandSelector.changed(updateHoopOptions);
  createElement('br');
  
  // Hoop size selector  
  createSpan("Hoop Size: ");
  hoopSelector = createSelect();
  hoopSelector.changed(() => {
    currentHoopPreset = hoopSelector.value();
    redraw();
  });
  
  // Initialize with generic hoops after the selector is created
  updateHoopOptions();
  createElement('br');
  
  createP("Paper Size:");
  
  createSpan("Paper: ");
  paperSelector = createSelect();
  
  // Add all available paper sizes
  Object.keys(PAPER_SIZES).forEach(paperKey => {
    const paper = PAPER_SIZES[paperKey];
    paperSelector.option(`${paperKey} (${paper.width}×${paper.height}mm)`, paperKey);
  });
  
  paperSelector.selected("A4");
  paperSelector.changed(() => {
    currentPaperSize = paperSelector.value();
    const paper = getPaperSize(currentPaperSize);
    const mmToPixelsDisplay = 72 / 25.4;
    resizeCanvas(paper.width * mmToPixelsDisplay, paper.height * mmToPixelsDisplay);
    redraw();
  });
  createElement('br');
  
  createP("Complete Workspace:");
  
  let workspaceButton = createButton("Draw Complete Workspace");
  workspaceButton.mousePressed(() => {
    background(255);
    drawEmbroideryWorkspace({
      hoopPreset: currentHoopPreset,
      gridSpacing: 10,
      showGrid: true,
      showHoopGuides: true, 
      showHoop: true,
      showCornerMarks: true,
      paperSize: currentPaperSize,
      margins: { top: 15, right: 15, bottom: 15, left: 15 }
    });
  });
  
  createP("Hoop Search Tools:");
  
  let findHoopButton = createButton("Find Best Hoop for 80×120mm Design");
  findHoopButton.mousePressed(() => {
    const bestHoop = findBestHoop(80, 120);
    if (bestHoop) {
      console.log("Best hoop for 80×120mm design:", bestHoop);
      alert(`Best hoop: ${bestHoop.key} (${bestHoop.width}×${bestHoop.height}mm)\n${bestHoop.description}`);
    } else {
      alert("No suitable hoop found for 80×120mm design");
    }
  });
  
  let listBrandsButton = createButton("List Available Brands");
  listBrandsButton.mousePressed(() => {
    const brands = getHoopBrands();
    console.log("Available brands:", brands);
    alert("Available brands: " + brands.join(", "));
  });
  
  let listBerninaButton = createButton("List Bernina Hoops");
  listBerninaButton.mousePressed(() => {
    const berninaHoops = getHoopsByBrand("bernina");
    console.log("Bernina hoops:", berninaHoops);
    let message = "Bernina Hoops:\n";
    berninaHoops.forEach(hoop => {
      message += `${hoop.key}: ${hoop.width}×${hoop.height}mm\n`;
    });
    alert(message);
  });
  
  noLoop(); // Static drawing, redraw on user interaction
}

function updateHoopOptions() {
  // Check if hoopSelector exists and has been created
  if (!hoopSelector || !hoopSelector.elt) {
    return;
  }
  
  // Clear existing options
  hoopSelector.elt.innerHTML = '';
  
  const selectedBrand = brandSelector.value();
  let hoopsToShow = [];
  
  if (selectedBrand === "manual") {
    // Show manual hoops
    hoopsToShow = getHoopsByType("manual");
  } else {
    // Show hoops for selected brand
    hoopsToShow = getHoopsByBrand(selectedBrand);
  }
  
  // Sort hoops by size (area)
  hoopsToShow.sort((a, b) => (a.width * a.height) - (b.width * b.height));
  
  // Add options to dropdown
  hoopsToShow.forEach(hoop => {
    const label = `${hoop.width}×${hoop.height}mm - ${hoop.description || 'Standard hoop'}`;
    hoopSelector.option(label, hoop.key);
  });
  
  // Set default selection
  if (hoopsToShow.length > 0) {
    currentHoopPreset = hoopsToShow[0].key;
    hoopSelector.selected(currentHoopPreset);
    redraw();
  }
}

function draw() {
  background(255);


    // IMPORTANT: Setup preview viewport before beginRecord
    setupPreviewViewport({
      scale: 1,
      minScale: 0.2,
      maxScale: 8
    });
    

  
  const hoop = getHoopPreset(currentHoopPreset);
  const paper = getPaperSize(currentPaperSize);
  const margins = { top: 15, right: 15, bottom: 15, left: 15 };
  
  // Calculate center position for hoop
  const availableWidth = paper.width - margins.left - margins.right;
  const availableHeight = paper.height - margins.top - margins.bottom;
  const hoopX = margins.left + availableWidth / 2;
  const hoopY = margins.top + availableHeight / 2;
  
  // Draw grid background
  if (showGrid) {
    drawGrid(10, { color: [0, 0, 0], alpha: 30, weight: 1 });
  }
  
  // Draw realistic hoop
  if (showHoop) {
    drawHoop(hoopX, hoopY, hoop);
  }
  
  // Draw hoop guides
  if (showHoopGuides) {
    drawHoopGuides(hoopX, hoopY, hoop);
  }
  
  // Draw corner marks for margins
  if (showCornerMarks) {
    drawCornerMarks(margins.left, margins.top, 
      paper.width - margins.left - margins.right,
      paper.height - margins.top - margins.bottom);
  }
  
  // Draw paper boundary
  push();
  stroke(128, 128, 128, 100);
  strokeWeight(2);
  noFill();
  rect(0, 0, width, height);
  
  // Draw margin guidelines
  stroke(192, 192, 192, 100);
  strokeWeight(1);
  rect(
    mmToPixel(margins.left),
    mmToPixel(margins.top),
    mmToPixel(paper.width - margins.left - margins.right),
    mmToPixel(paper.height - margins.top - margins.bottom)
  );
  pop();
  
  // Display info
  push();
  fill(0);
  textSize(12);
  
  // Paper info
  text(`Paper: ${currentPaperSize} (${paper.width}×${paper.height}mm)`, 10, height - 70);
  
  // Hoop info with more details
  let hoopInfo = `Hoop: ${currentHoopPreset} (${hoop.width}×${hoop.height}mm)`;
  if (hoop.brand) {
    hoopInfo += ` - ${hoop.brand.charAt(0).toUpperCase() + hoop.brand.slice(1)}`;
  }
  if (hoop.type) {
    hoopInfo += ` ${hoop.type}`;
  }
  text(hoopInfo, 10, height - 55);
  
  // Additional hoop details
  if (hoop.description) {
    text(`Description: ${hoop.description}`, 10, height - 40);
  }
  
  // Canvas info
  text(`Canvas: ${width}×${height}px @ 72 DPI`, 10, height - 25);
  
  // Hoop area utilization
  const hoopArea = hoop.width * hoop.height;
  const paperUsableArea = (paper.width - 30) * (paper.height - 30); // Account for margins
  const utilization = ((hoopArea / paperUsableArea) * 100).toFixed(1);
  text(`Paper utilization: ${utilization}%`, 10, height - 10);
  
  pop();

  endPreviewViewport();
}

// Handle mouse wheel zooming
function mouseWheel(event) {
  handlePreviewZoom(event);
  redraw();
  return false;
}

// Handle mouse interactions
function mousePressed() {
  // First check if the mouse press was handled by the preview controls
  if (handlePreviewControlsPressed(mouseX, mouseY)) {
    redraw();
    return;
  }
  
  // Otherwise handle as pan
  startPreviewPan();
}

function mouseDragged() {
  // Handle slider dragging
  handlePreviewControlsDragged(mouseY);
  
  // Handle panning
  handlePreviewPan();
  redraw();
}

function mouseReleased() {
  handlePreviewControlsReleased();
  stopPreviewPan();
}