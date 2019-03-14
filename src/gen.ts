import * as path from 'path'
import * as fs from 'fs'
import * as ts from 'typescript'

const typesPath = "./node_modules/element-ui/types"

const typesDir = fs.readdirSync(typesPath)

const dtsFiles = typesDir.filter(x => x.endsWith('.d.ts'))

function findClassDeclaration(ast: ts.SourceFile) {
    const classes: ts.ClassDeclaration[] = []

    ts.transform(ast, [context => {
        return rootNode => {
            const visitor = (node: ts.Node) => {
                if (node.kind === ts.SyntaxKind.ClassDeclaration) {
                    const classDeclaration = <ts.ClassDeclaration>node
                    if (classDeclaration.heritageClauses && classDeclaration.heritageClauses.find(clause => {
                        return !!(clause.token === ts.SyntaxKind.ExtendsKeyword && clause.types.find(type => {
                            return ts.isIdentifier(type.expression) && type.expression.text === 'ElementUIComponent'
                        }))
                    })) {
                        classes.push(classDeclaration)
                    }
                }
                return ts.visitEachChild(node, visitor, context);
            }
            return ts.visitNode(rootNode, visitor);
        };
    }])
    return classes
}

interface ClassDeclarationInfo {
    classDecl: ts.ClassDeclaration,
    file: string
    sourceFile: ts.SourceFile
}

const classDeclarations: ClassDeclarationInfo[] = dtsFiles.map(file => {
    const content = fs.readFileSync(path.resolve(path.join(typesPath, file))).toString()
    const sourceFile = ts.createSourceFile("1.ts", content, ts.ScriptTarget.Latest)
    return {
        classDecl: findClassDeclaration(sourceFile),
        file,
        sourceFile
    }
}).filter(x => x.classDecl.length === 1).map(x => ({
    file: x.file,
    sourceFile: x.sourceFile,
    classDecl: x.classDecl[0]
}))

function transformDeclaration(name: string, decl: ts.ClassDeclaration): ts.Node[] {
    const filename = path.basename(name, '.d.ts')
    const className = decl.name.text

    return [
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
            ts.createImportClause(ts.createIdentifier(className), undefined),
            ts.createStringLiteral(`element-ui/lib/${filename}`)
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
                            ts.createTypeReferenceNode(
                                ts.createIdentifier('Props'),
                                undefined
                            ),
                            ts.createTypeReferenceNode(
                                ts.createIdentifier('Events'),
                                undefined
                            )
                        ],
                        []
                    ),
                    ts.createIdentifier('convert')
                ),
                undefined,
                [
                    ts.createAsExpression(
                        ts.createIdentifier(className),
                        ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)
                    )
                ]
            )
        ),
        ts.createTypeAliasDeclaration(
            undefined,
            undefined,
            ts.createIdentifier('Props'),
            undefined,
            ts.createTypeLiteralNode([
                ts.createPropertySignature(
                    undefined,
                    ts.createIdentifier('absolute'),
                    ts.createToken(ts.SyntaxKind.QuestionToken),
                    ts.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
                    undefined
                )
            ])
        ),
        ts.createTypeAliasDeclaration(
            undefined,
            undefined,
            ts.createIdentifier('Events'),
            undefined,
            ts.createTypeLiteralNode([
                ts.createPropertySignature(
                    undefined,
                    ts.createIdentifier('onClick'),
                    undefined,
                    ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
                    undefined
                )
            ])
        )
    ]
}

const printer = ts.createPrinter()
console.log(printer.printList(ts.ListFormat.MultiLine, ts.createNodeArray(transformDeclaration(classDeclarations[0].file, classDeclarations[0].classDecl)), classDeclarations[0].sourceFile))