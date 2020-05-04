'use strict'

const authService = require('../services/auth-service')
const constant = require('../utils/constants')
const produtosService = require('../services/produtos-service')
const service = require('../services/carrinhos-service')
const usuariosService = require('../services/usuarios-service')

exports.get = async (req, res) => {
  try {
    const carrinhos = await service.getAll(req.query)
    res.status(200).send({ quantidade: carrinhos.length, carrinhos })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

/*
X 1 carrinho por user
X validar idProduto
X verificar estoque do produto
X subtrair estoque do produto
X pegar e cadastrar idUsuario
X pegar e cadastrar preço do produto
*/

exports.post = async (req, res) => {
  try {
    const { email, password } = authService.verifyToken(req.headers.authorization)
    const { _id } = await usuariosService.getDadosDoUsuario({ email, password })
    const usuarioJaPossuiCarrinho = await service.existeCarrinho({ idUsuario: _id })
    if (usuarioJaPossuiCarrinho) {
      return res.status(400).send({ message: constant.LIMITE_1_CARRINHO })
    }

    const idProdutosDuplicados = service.extrairProdutosDuplicados(req.body.produtos)
    const temProdutosDuplicados = typeof idProdutosDuplicados[0] !== 'undefined'
    if (temProdutosDuplicados) {
      return res.status(400).send({ message: constant.CARRINHO_COM_PRODUTO_DUPLICADO, idProdutosDuplicados })
    }

    const produtos = req.body.produtos
    for (let index = 0; index < produtos.length; index++) {
      produtos[index].quantidade = parseInt(produtos[index].quantidade)
      const { idProduto, quantidade } = produtos[index]
      if (!await produtosService.existeProduto({ _id: idProduto })) {
        return res.status(400).send({ message: constant.IDPRODUTO_INVALIDO, item: { index, idProduto, quantidade } })
      }

      const { quantidade: quantidadeEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
      if (quantidade > quantidadeEstoque) {
        return res.status(400).send({ message: constant.ESTOQUE_INSUFICIENTE, item: { index, idProduto, quantidade, quantidadeEstoque } })
      }
      Object.assign(produtos[index], { precoUnitario: preco })
    }
    let precoTotal = 0
    let quantidadeTotal = 0
    for (let index = 0; index < produtos.length; index++) {
      const { idProduto, quantidade } = produtos[index]
      const { quantidade: quantidadeEmEstoque, preco } = await produtosService.getDadosDoProduto({ _id: idProduto })
      const novaQuantidade = quantidadeEmEstoque - quantidade
      await produtosService.updateById(idProduto, { $set: { quantidade: novaQuantidade } })
      precoTotal += preco * quantidade
      quantidadeTotal += quantidade
    }

    Object.assign(req.body, { precoTotal, quantidadeTotal, idUsuario: _id })

    const dadosCadastrados = await service.criarCarrinho(req.body)
    res.status(201).send({ message: constant.POST_SUCESS, _id: dadosCadastrados._id })
  } catch (error) {
    res.status(500).send({ message: constant.INTERNAL_ERROR, error })
  }
}

/*
user tem que ser dono do carrinho ou adm
somar estoque do produto
*/

// exports.delete = async (req, res) => {
//   try {
//     const quantidadeRegistrosExcluidos = await service.deleteById(req.params.id)
//     const message = quantidadeRegistrosExcluidos === 0 ? constant.DELETE_NONE : constant.DELETE_SUCESS
//     res.status(200).send({ message })
//   } catch (error) {
//     res.status(500).send({ message: constant.INTERNAL_ERROR, error })
//   }
// }

/*
se user tiver carrinho > edita
se user n tiver carrinho > cadastra
verificar estoque do produto
pegar e cadastrar idUsuario
pegar e cadastrar preço do produto
*/

// exports.put = async (req, res) => {
//   try {
//     const registroCriado = await service.createOrUpdateById(req.params.id, req.body)
//     if (registroCriado) { return res.status(201).send({ message: constant.POST_SUCESS, _id: registroCriado._id }) }
//     res.status(200).send({ message: constant.PUT_SUCESS })
//   } catch (error) {
//     res.status(500).send({ message: constant.INTERNAL_ERROR, error })
//   }
// }
