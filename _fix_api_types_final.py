# -*- coding: utf-8 -*-
"""
Fix remaining TypeScript type errors - Final patch
"""

import os

def fix_entrustment_id_route():
    """Fix entrustment/[id]/route.ts - make context optional"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/[id]/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace RouteParams interface
    content = content.replace(
        'interface RouteParams {\n  params: Promise<{ id: string }>\n}',
        'interface RouteParams {\n  params: Promise<{ id: string }>\n}'
    )

    # Fix function signatures to make context optional with default
    content = content.replace(
        'export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {',
        'export const GET = withErrorHandler(async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {',
        'export const PUT = withErrorHandler(async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const DELETE = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {',
        'export const DELETE = withErrorHandler(async (request: NextRequest, context?: { params: Promise<{ id: string }> }) => {\n  const { params } = context!'
    )

    # Fix filter callbacks
    content = content.replace(
        'const toUpdate = projects.filter((p: { id?: string }) => p.id && existingIds.includes(p.id))',
        'const toUpdate = projects.filter((p: { id?: string }) => p.id && existingIds.includes(p.id))'
    )

    content = content.replace(
        'const toDeleteIds = existingIds.filter(eid => !projects.some((p: { id?: string }) => p.id === eid))',
        'const toDeleteIds = existingIds.filter((eid: string) => !projects.some((p: { id?: string }) => p.id === eid))'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_entrustment_id_external_link():
    """Fix entrustment/[id]/external-link/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/[id]/external-link/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = content.replace(
        'export const POST = withErrorHandler(async (\n  request: NextRequest,\n  { params }: { params: Promise<{ id: string }> }\n) => {',
        'export const POST = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_entrustment_projects_projectId():
    """Fix entrustment/[id]/projects/[projectId]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/entrustment/[id]/projects/[projectId]/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Make RouteParams optional
    content = content.replace(
        'export const PUT = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {',
        'export const PUT = withErrorHandler(async (request: NextRequest, context?: { params: Promise<{ id: string; projectId: string }> }) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const GET = withErrorHandler(async (request: NextRequest, { params }: RouteParams) => {',
        'export const GET = withErrorHandler(async (request: NextRequest, context?: { params: Promise<{ id: string; projectId: string }> }) => {\n  const { params } = context!'
    )

    # Fix filter callback
    content = content.replace(
        'const project = entrustment.projects.find(p => p.id === projectId)',
        'const project = entrustment.projects.find((p) => p.id === projectId)'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_evaluation_template_id():
    """Fix evaluation-template/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/evaluation-template/[id]/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove RouteParams interface and use inline type
    content = content.replace(
        'interface RouteParams {\n  params: Promise<{ id: string }>\n}\n\n',
        ''
    )

    # Update all function signatures
    content = content.replace(
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const PUT = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const PUT = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_finance_payment_id():
    """Fix finance/payment/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/finance/payment/[id]/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove RouteParams interface
    content = content.replace(
        'interface RouteParams {\n  params: Promise<{ id: string }>\n}\n\n',
        ''
    )

    # Update function signatures
    content = content.replace(
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

def fix_quotation_id():
    """Fix quotation/[id]/route.ts"""
    file_path = '/Users/wangpeng/Downloads/limsnext/src/app/api/quotation/[id]/route.ts'

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove RouteParams interface
    content = content.replace(
        'interface RouteParams {\n  params: Promise<{ id: string }>\n}\n\n',
        ''
    )

    # Update all function signatures
    content = content.replace(
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const GET = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const PUT = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const PUT = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const DELETE = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    content = content.replace(
        'export const PATCH = withErrorHandler(async (\n  request: NextRequest,\n  { params }: RouteParams\n) => {',
        'export const PATCH = withErrorHandler(async (\n  request: NextRequest,\n  context?: { params: Promise<{ id: string }> }\n) => {\n  const { params } = context!'
    )

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'✓ Fixed: {file_path}')

# Run all fixes
if __name__ == '__main__':
    print('Applying final TypeScript type fixes...\n')

    fix_entrustment_id_route()
    fix_entrustment_id_external_link()
    fix_entrustment_projects_projectId()
    fix_evaluation_template_id()
    fix_finance_payment_id()
    fix_quotation_id()

    print('\n✓ Final fixes applied!')
