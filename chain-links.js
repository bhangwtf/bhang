/* Shared BTC / Ordinals link helpers for bhang.wtf (addresses, txs, inscription ids). */
(function (global) {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function outpointParts(op) {
    var s = String(op || '');
    var i = s.lastIndexOf(':');
    if (i < 0) return { txid: s, vout: '' };
    return { txid: s.slice(0, i), vout: s.slice(i + 1) };
  }

  function isTxid(s) {
    return /^[0-9a-fA-F]{64}$/.test(String(s || ''));
  }

  function isInscriptionId(s) {
    return /^[0-9a-fA-F]{64}i\d+$/.test(String(s || ''));
  }

  function link(href, label, cls) {
    return (
      '<a class="' +
      (cls || 'chain-link') +
      '" href="' +
      href +
      '" target="_blank" rel="noopener">' +
      esc(label) +
      '</a>'
    );
  }

  function addrLink(addr, cls) {
    if (!addr || addr === 'unknown') return esc(addr || '');
    return link(
      'https://mempool.space/address/' + encodeURIComponent(addr),
      addr,
      cls || 'chain-link chain-link-addr'
    );
  }

  function txLink(txid, cls) {
    if (!txid) return '';
    return link(
      'https://mempool.space/tx/' + encodeURIComponent(txid),
      txid,
      cls || 'chain-link chain-link-tx'
    );
  }

  function outpointLink(op, cls) {
    if (!op) return '';
    var parts = outpointParts(op);
    if (!isTxid(parts.txid)) return esc(op);
    return link(
      'https://mempool.space/tx/' + encodeURIComponent(parts.txid),
      op,
      cls || 'chain-link chain-link-outpoint'
    );
  }

  function inscriptionContentLink(id, cls) {
    if (!id) return '';
    return link(
      'https://ordinals.com/content/' + encodeURIComponent(id),
      id,
      cls || 'chain-link chain-link-inscription'
    );
  }

  global.BhangLinks = {
    esc: esc,
    outpointParts: outpointParts,
    isTxid: isTxid,
    isInscriptionId: isInscriptionId,
    addrLink: addrLink,
    txLink: txLink,
    outpointLink: outpointLink,
    inscriptionContentLink: inscriptionContentLink,
  };
})(typeof window !== 'undefined' ? window : globalThis);
