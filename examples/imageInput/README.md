# Image to Embroidery Converter

This example converts images into embroidery patterns using advanced image processing techniques. It extracts outlines or centerlines from images and converts them into embroidery stitches.

## Features

### 1. Image Loading
- Upload any image file (JPG, PNG, GIF, etc.)
- Automatic image preview
- Aspect ratio preservation

### 2. Image Processing
- **Threshold**: Control black/white conversion
- **Invert Threshold**: Reverse the thresholding effect
- **Blur Radius**: Apply Gaussian blur for noise reduction
- **Edge Detection Methods**:
  - Simple Threshold: Basic black/white conversion
  - Canny Edge Detection: Advanced edge detection
  - Sobel Filter: Gradient-based edge detection
- **Contour Method**:
  - Outline: Extract outer boundaries
  - Centerline: Extract medial axis (skeleton)

### 3. Path Processing
- **Min Path Length**: Filter out small noise paths
- **Path Simplification**: Reduce path complexity using Douglas-Peucker algorithm
- **Smoothing Iterations**: Apply iterative smoothing to paths

### 4. Embroidery Generation
- **Embroidery Modes**:
  - Running Stitch: Simple outline stitching
  - Satin Fill: Dense fill stitching
  - Crosshatch Fill: Cross-pattern fill
- **Stitch Settings**:
  - Stitch Length (mm)
  - Row Spacing (mm)
  - Color controls for stroke and fill

### 5. Output Control
- **Dimensions**: Set precise output size in millimeters
- **Aspect Ratio**: Lock to maintain original proportions
- **Export Formats**:
  - DST (Tajima embroidery format)
  - G-code (for CNC/embroidery machines)

## How to Use

1. **Start the Server**:
   ```bash
   cd 0.p5.embroider/examples/imageInput
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

2. **Load an Image**:
   - Click "Choose File" in the Image Input section
   - Select an image from your computer
   - The image will appear in the preview

3. **Adjust Image Processing**:
   - Start with the default settings
   - Adjust threshold to control which parts become stitches
   - Try different edge detection methods for different effects
   - Use blur to reduce noise in sketchy images

4. **Fine-tune Paths**:
   - Increase min path length to remove small artifacts
   - Adjust path simplification to balance detail vs. complexity
   - Add smoothing iterations for cleaner curves

5. **Configure Embroidery**:
   - Choose embroidery mode based on desired effect
   - Adjust stitch length and spacing for your machine
   - Set output dimensions for your project

6. **Export**:
   - Press 'D' key or click "Export DST" for embroidery files
   - Press 'G' key or click "Export G-code" for CNC machines

## Debug & Logging System

### Debug Controls
- **Enable Debug Logging**: Toggle comprehensive logging on/off
- **Clear Logs**: Clear console and internal log history
- **Show Stats**: Display log statistics in console
- **Export Logs**: Download detailed processing logs as JSON

### Debugging Failed Path Generation

When images don't generate paths, check the console logs for:

1. **Image Loading Issues**:
   - File type validation
   - Image dimensions and aspect ratio
   - Loading errors

2. **Edge Detection Problems**:
   - Edge pixel count and ratio
   - Gradient magnitude ranges (for Canny)
   - Threshold effectiveness

3. **Path Extraction Issues**:
   - Binary image statistics (white/black pixel ratio)
   - Number of raw contours found
   - Contour filtering results
   - Path simplification impact

4. **Processing Performance**:
   - Time spent in each stage
   - Memory usage patterns
   - Processing bottlenecks

### Common Debug Scenarios

**No paths detected**: Look for `PATH_EXTRACTION` warnings with suggested fixes
**Poor edge detection**: Check `CANNY` or `THRESHOLD` logs for pixel statistics
**Slow processing**: Review timing logs in each stage
**Memory issues**: Monitor image and canvas size logs

## Keyboard Shortcuts

- `D`: Export DST file
- `G`: Export G-code file
- `S`: Switch to stitch view mode
- `R`: Switch to realistic view mode
- `P`: Switch to p5.js view mode

## Tips for Best Results

### Image Preparation
- Use high-contrast images for better edge detection
- Clean, simple line drawings work best
- Avoid very detailed or noisy images
- Consider the final embroidery size when choosing detail level

### Processing Settings
- **For Line Art**: Use Simple Threshold with high contrast
- **For Photos**: Use Canny Edge Detection with moderate threshold
- **For Sketches**: Add blur first, then use edge detection
- **For Clean Paths**: Increase path simplification and smoothing

### Embroidery Settings
- **Running Stitch**: Best for outlines and line art
- **Satin Fill**: Good for solid shapes and text
- **Crosshatch**: Creates textured fill patterns

## Technical Details

### Image Processing Pipeline
1. Load and resize image to processing canvas
2. Apply blur filter if specified
3. Apply selected edge detection algorithm
4. Extract contours using connected component analysis
5. Simplify paths using Douglas-Peucker algorithm
6. Apply smoothing using iterative averaging
7. Convert to embroidery coordinates and generate stitches

### Algorithms Used
- **Canny Edge Detection**: Multi-stage edge detection with gradient calculation
- **Sobel Filter**: Gradient-based edge detection using convolution
- **Douglas-Peucker**: Path simplification preserving important points
- **Contour Tracing**: Connected component analysis for path extraction
- **Path Smoothing**: Iterative coordinate averaging

### Coordinate System
- Input images are processed in pixel coordinates
- Paths are normalized to 0-1 range
- Final output is scaled to specified millimeter dimensions
- Embroidery coordinates use millimeters as base unit

## Troubleshooting

### No Paths Detected
- Lower the threshold value
- Try a different edge detection method
- Reduce min path length
- Check if image has sufficient contrast

### Too Many Small Paths
- Increase min path length
- Add blur to reduce noise
- Increase path simplification
- Use a higher threshold

### Paths Too Jagged
- Increase smoothing iterations
- Add slight blur before processing
- Increase path simplification slightly

### Export Issues
- Ensure paths have been generated first
- Check browser console for error messages
- Verify output dimensions are reasonable (10-300mm) 