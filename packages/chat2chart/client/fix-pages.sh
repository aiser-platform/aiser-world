#!/bin/bash

# Script to remove all dynamic exports from pages
# This will fix the "[object Object]" revalidate errors

echo "Fixing pages by removing dynamic exports..."

# Find all page.tsx files and remove dynamic exports
find src -name "page.tsx" -type f -exec sed -i '/export const dynamic/d' {} \;
find src -name "page.tsx" -type f -exec sed -i '/export const revalidate/d' {} \;
find src -name "page.tsx" -type f -exec sed -i '/export const fetchCache/d' {} \;
find src -name "page.tsx" -type f -exec sed -i '/export const runtime/d' {} \;
find src -name "page.tsx" -type f -exec sed -i '/export const preferredRegion/d' {} \;

echo "Pages fixed! Removed all dynamic exports."
echo "Now just using 'use client' directive for client-side rendering."
