# Nethra AI - Teachable Machine Integration Guide

## Integration Steps

1.  **Export Model:**
    - Go to Google Teachable Machine.
    - Click **Export Model**.
    - Choose **TensorFlow.js** format.
    - Download the zip file.

2.  **Place Files:**
    - Extract the zip file. You should see `model.json`, `metadata.json`, and one or more `.bin` files.
    - Copy these files into the `assets/model/` directory of this project.
    - **Important:** Ensure the filenames match what the code expects (or update `lib/ai/model-loader.ts`):
        - `model.json`
        - `weights.bin` (If there are multiple shards like `group1-shard1of1.bin`, rename to `weights.bin` or update `lib/ai/model-loader.ts` to require the correct filename).

3.  **Run the App:**
    - `npx expo start`
    - Open on your device using Expo Go or a Development Build.
    - Navigate to the Camera screen.
    - Capture an image.

4.  **Verify:**
    - Check the terminal logs for:
        - `[AI] TensorFlow.js backend ready.`
        - `[AI] Model loaded successfully.`
        - `[AI] Inference complete in ...ms.`

## File Structure Created

- `lib/ai/model-loader.ts`: Handles loading the model and weights. Implements a singleton pattern.
- `lib/ai/image-preprocess.ts`: Resizes images to 224x224 and normalizes pixel values to [-1, 1].
- `lib/ai/inference.ts`: Runs the prediction and maps "Normal", "Hole", "Stain" labels to app-specific DefectResults.
- `lib/ai/index.ts`: Exports the AI module.
- `assets/model/`: Directory for your model files (currently contains placeholders).

## Troubleshooting

- **Model Load Error:** Ensure `model.json` paths in `weightsManifest` match the actual `.bin` filenames. Sometimes Teachable Machine exports `group1-shard1of1.bin` but `model.json` references it correctly. If you rename the bin file, ensure `model.json` references the new name.
- **Preprocessing Error:** Ensure `expo-image-manipulator` is installed and compatible.
