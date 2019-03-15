import * as ts from 'typescript'

function toCase(text: string) {
    return text.replace(/\-[a-z]/g, v => v.substring(1).toUpperCase())
}

export function hasComponent(content: string): boolean {
    let hasComponent = false
    ts.transform(ts.createSourceFile('', content, ts.ScriptTarget.Latest), [context => {
        return rootNode => {
            const visitor: ts.Visitor = (node: ts.Node) => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDeclaration = <ts.ClassDeclaration>node
                    if (classDeclaration.name && classDeclaration.heritageClauses && classDeclaration.heritageClauses.find(clause => {
                        return !!(clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.find(type => {
                            return ts.isIdentifier(type.expression) && type.expression.text === 'ElementUIComponent'
                        }))
                    })) {
                        hasComponent = true
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(rootNode, visitor);
        };
    }])

    return hasComponent
}

export function transform(name: string) {
    const typeName = toCase(`El-${name}`)
    const libName = `__${toCase(name)}`
    const file = ts.createSourceFile('', '', ts.ScriptTarget.Latest)
    const newFile = ts.updateSourceFileNode(file, [
        ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(
                undefined,
                ts.createNamedImports([
                    ts.createImportSpecifier(undefined, ts.createIdentifier('ofType'))
                ])
            ),
            ts.createStringLiteral('vue-tsx-support')
        ),
        ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(ts.createIdentifier(libName), undefined),
            ts.createStringLiteral(`element-ui/lib/${name}`)
        ),
        ts.createImportDeclaration(
            undefined,
            undefined,
            ts.createImportClause(
                undefined,
                ts.createNamedImports([
                    ts.createImportSpecifier(undefined, ts.createIdentifier(typeName))
                ])
            ),
            ts.createStringLiteral(`element-ui/types/${name}`)
        ),
        ts.createExportAssignment(
            undefined,
            undefined,
            undefined,
            ts.createCall(
                ts.createPropertyAccess(
                    ts.createCall(
                        ts.createIdentifier('ofType'),
                        [
                            ts.createTypeReferenceNode(ts.createIdentifier('Partial'), [
                                ts.createTypeReferenceNode(
                                    ts.createIdentifier(typeName),
                                    undefined
                                )
                            ]),
                            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                            ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                        ],
                        []
                    ),
                    ts.createIdentifier('convert')
                ),
                undefined,
                [ts.createIdentifier(libName)]
            )
        )
    ])
    const printer = ts.createPrinter()
    return printer.printFile(newFile)
}
