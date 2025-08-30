import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { OutputGallery } from './components/OutputGallery';
import { DESCRIPTORS } from './constants';
import type { DescriptorValues, InspirationTemplate } from './types';
import { analyzeAsset, generateSynthesis, enhancePrompt, createImagePrompt, analyzeAndExtractDescriptors } from './services/geminiService';

const App: React.FC = () => {
  const [uploadedAsset, setUploadedAsset] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [descriptors, setDescriptors] = useState<DescriptorValues>(
    DESCRIPTORS.reduce((acc, desc) => ({ ...acc, [desc.id]: desc.defaultValue }), {})
  );
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [lastSynthesizedPrompt, setLastSynthesizedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<string>('1:1');

  // FIX: Added `setDescriptors` to the dependency array.
  const handleDescriptorChange = useCallback((id: string, value: number) => {
    setDescriptors(prev => ({ ...prev, [id]: value }));
  }, [setDescriptors]);
  
  // FIX: Added all state setters to the dependency array.
  const handleSelectTemplate = useCallback((template: InspirationTemplate) => {
    setPrompt(template.prompt);
    setDescriptors(template.descriptors);
    setUploadedAsset(null);
    setError(null);
    setGeneratedImages([]);
  }, [setPrompt, setDescriptors, setUploadedAsset, setError, setGeneratedImages]);

  // FIX: Added all state setters to the dependency array.
  const handleAssetUpload = useCallback(async (asset: string | null) => {
    setUploadedAsset(asset);
    setError(null);
    if (asset) {
      setIsAnalyzing(true);
      try {
        const extractedDescriptors = await analyzeAndExtractDescriptors(asset);
        setDescriptors(extractedDescriptors);
      } catch (e: any) {
        setError(e.message || "Failed to analyze asset.");
      } finally {
        setIsAnalyzing(false);
      }
    } else {
        setDescriptors(DESCRIPTORS.reduce((acc, desc) => ({ ...acc, [desc.id]: desc.defaultValue }), {}));
    }
  }, [setUploadedAsset, setError, setIsAnalyzing, setDescriptors]);

  // FIX: Added all state setters to the dependency array.
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt) return;
    setIsEnhancing(true);
    setError(null);
    try {
      const enhanced = await enhancePrompt(prompt);
      setPrompt(enhanced);
    } catch (e: any) {
      setError(e.message || "Failed to enhance prompt.");
    } finally {
      setIsEnhancing(false);
    }
  }, [prompt, setPrompt, setIsEnhancing, setError]);

  // FIX: Added all state setters to the dependency array.
  const handleSynthesize = useCallback(async () => {
    setIsLoading(true);
    setGeneratedImages([]);
    setError(null);
    setLastSynthesizedPrompt(null);

    try {
      let baseDescription = '';
      if (uploadedAsset) {
        baseDescription = await analyzeAsset(uploadedAsset);
      }
      
      const finalPrompt = await createImagePrompt(baseDescription, prompt, descriptors);
      setLastSynthesizedPrompt(finalPrompt);
      
      const images = await generateSynthesis(finalPrompt, aspectRatio);
      setGeneratedImages(images);

    } catch (e: any) {
      setError(e.message || "An unknown error occurred during synthesis.");
    } finally {
      setIsLoading(false);
    }
  }, [uploadedAsset, prompt, descriptors, aspectRatio, setIsLoading, setGeneratedImages, setError, setLastSynthesizedPrompt]);


  return (
    <div className="h-screen w-screen flex flex-col bg-transparent overflow-hidden font-sans">
      <Header />
      <main className="flex-grow grid grid-cols-1 md:grid-cols-3 lg:grid-cols-2 gap-6 p-6 h-full overflow-hidden">
        <div className="md:col-span-1 lg:col-span-1 h-full overflow-hidden">
          <InputPanel
            uploadedAsset={uploadedAsset}
            onAssetUpload={handleAssetUpload}
            onUploadError={setError}
            prompt={prompt}
            onPromptChange={setPrompt}
            descriptors={descriptors}
            onDescriptorChange={handleDescriptorChange}
            onSynthesize={handleSynthesize}
            isLoading={isLoading}
            onEnhancePrompt={handleEnhancePrompt}
            isEnhancing={isEnhancing}
            isAnalyzing={isAnalyzing}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
          />
        </div>
        <div className="md:col-span-2 lg:col-span-1 h-full bg-gray-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-y-auto">
          <OutputGallery
            images={generatedImages}
            isLoading={isLoading}
            error={error}
            onSelectTemplate={handleSelectTemplate}
            lastSynthesizedPrompt={lastSynthesizedPrompt}
          />
        </div>
      </main>
    </div>
  );
};

export default App;
