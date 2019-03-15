import * as path from 'path'
import * as fs from 'fs'
import * as ts from 'typescript'

const typesPath = "./node_modules/element-ui/types"

const typesDir = fs.readdirSync(typesPath)

const dtsFiles = typesDir.filter(x => x.endsWith('.d.ts'))

function transformDtsFile(ast: ts.SourceFile, name: string) {
    const comp = `$${name.replace(/\-[a-z]/g, v => v.substring(1).toUpperCase())}`
    let hasComponent = false
    const result = ts.transform(ast, [context => {
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
                        return [
                            ts.visitEachChild(node, visitor, context),
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
                                                        ts.createIdentifier(classDeclaration.name.text),
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
                                    [ts.createIdentifier(comp)]
                                )
                            )
                        ]
                    }
                }
                if (node.kind === ts.SyntaxKind.ImportDeclaration) {
                    const importDeclaration = <ts.ImportDeclaration>node
                    if (ts.isStringLiteralLike(importDeclaration.moduleSpecifier) && importDeclaration.moduleSpecifier.text === './component') {
                        return [
                            ts.createImportDeclaration(
                                undefined,
                                undefined,
                                importDeclaration.importClause,
                                ts.createStringLiteral('element-ui/types/component')
                            ),
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
                                ts.createImportClause(ts.createIdentifier(comp), undefined),
                                ts.createStringLiteral('element-ui/lib/alert')
                            )
                        ]
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(rootNode, visitor);
        };
    }])

    return hasComponent ? result : undefined
}

const printer = ts.createPrinter()
const libPath = './lib/types'
if (!fs.existsSync(libPath)) {
    fs.mkdirSync(libPath)
}

dtsFiles.forEach(dtsFile => {
    const name = path.basename(dtsFile, '.d.ts')
    const file = ts.createSourceFile('', fs.readFileSync(path.join(typesPath, dtsFile)).toString(), ts.ScriptTarget.Latest)
    const result = transformDtsFile(file, name)
    if (result) {
        const [transformed] = result.transformed
        const code = printer.printFile(transformed)

        fs.writeFileSync(path.join(libPath, `${name}.ts`), code)
    }
})
