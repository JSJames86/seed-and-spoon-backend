-- Migration: 005_fix_function_search_path.sql
-- Purpose: Fix mutable search_path security warnings on functions
--
-- Issue: Functions without a fixed search_path can be exploited
-- via search_path injection attacks.
--
-- Fix: Set search_path to empty string '' which forces fully
-- qualified names and prevents injection.

-- ============================================================================
-- Fix search_path for food_resources_set_search_tsv
-- ============================================================================
ALTER FUNCTION public.food_resources_set_search_tsv()
SET search_path = '';

-- ============================================================================
-- Fix search_path for food_resources_set_location
-- ============================================================================
ALTER FUNCTION public.food_resources_set_location()
SET search_path = '';

-- ============================================================================
-- Fix search_path for generate_receipt_number
-- ============================================================================
ALTER FUNCTION public.generate_receipt_number()
SET search_path = '';
