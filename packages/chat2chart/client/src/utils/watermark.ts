/**
 * Watermark Utility
 * Adds Aiser logo watermark to ECharts configurations based on plan type
 */

import { EChartsOption } from 'echarts';

/**
 * Check if watermark should be applied based on plan type
 */
export const shouldApplyWatermark = (planType: string | null | undefined): boolean => {
  // Free plan = watermark enabled, Pro+ = watermark disabled
  return !planType || planType === 'free';
};

/**
 * Add watermark to ECharts option configuration
 * Watermark is added as a graphic element positioned at the center
 */
export const addWatermarkToChart = (
  option: EChartsOption,
  planType: string | null | undefined
): EChartsOption => {
  // CRITICAL: Validate option before processing
  if (!option || typeof option !== 'object') {
    console.warn('⚠️ Watermark: Invalid option, returning as-is');
    return option;
  }

  if (!shouldApplyWatermark(planType)) {
    console.log('🚫 Watermark skipped - plan type:', planType);
    return option;
  }

  try {
    // Create a deep copy to avoid mutating the original
    const optionCopy = JSON.parse(JSON.stringify(option));

  // Ensure graphics array exists at root level
  if (!optionCopy.graphic) {
    optionCopy.graphic = [];
  } else if (!Array.isArray(optionCopy.graphic)) {
    optionCopy.graphic = [];
  }

  // Remove any existing watermark first
  optionCopy.graphic = optionCopy.graphic.filter((g: any) => g && g.id !== 'aiser-watermark');

  // Add watermark graphic element - ECharts graphic component format
  // Reference: https://echarts.apache.org/en/option.html#graphic.elements-image
  // Use 'center' which ECharts handles automatically
  // Use square ratio (1:1) to prevent stretching - shrink width if needed
  const WATERMARK_SIZE = 120; // Square watermark (120x120) - smaller and maintains aspect ratio
  
  const watermarkGraphic: any = {
    type: 'image',
    id: 'aiser-watermark',
    left: 'center', // ECharts will center this automatically
    top: 'center', // ECharts will center this automatically
    style: {
      image: '/aiser-logo.png', // Path to logo in public folder
      width: WATERMARK_SIZE,
      height: WATERMARK_SIZE, // Square ratio (1:1) to prevent stretching
      opacity: 0.4, // 40% opacity - more visible watermark
    },
    z: 999999, // Very high z-index to appear on top of all chart elements
    silent: true, // Don't interfere with chart interactions
    invisible: false,
    zlevel: 10, // High zlevel to ensure it's rendered on top layer
    // Use 'all' bounding to maintain aspect ratio (prevents stretching)
    bounding: 'all', // Maintains aspect ratio by constraining both width and height
  };
  
  // Verify image exists (for debugging) - only in browser
  if (typeof window !== 'undefined') {
    const img = new Image();
    img.onload = () => console.log('✅ Watermark image loaded successfully:', '/aiser-logo.png');
    img.onerror = () => console.error('❌ Watermark image failed to load:', '/aiser-logo.png');
    img.src = '/aiser-logo.png';
  }

    // Add watermark to graphics array
    optionCopy.graphic.push(watermarkGraphic);
    
    console.log('✅ Watermark added to chart - Graphics count:', optionCopy.graphic.length);
    console.log('🎨 Watermark config:', watermarkGraphic);

    return optionCopy;
  } catch (error) {
    // CRITICAL: Don't break chart rendering if watermark fails
    console.error('❌ Watermark application error (non-blocking):', error);
    return option; // Return original option if watermark fails
  }
};

/**
 * Remove watermark from ECharts option
 */
export const removeWatermarkFromChart = (option: EChartsOption): EChartsOption => {
  if (option.graphic && Array.isArray(option.graphic)) {
    option.graphic = option.graphic.filter((g: any) => g.id !== 'aiser-watermark');
  }
  return option;
};


